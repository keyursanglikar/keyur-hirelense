import os
import re
import json
import logging
import random
from django.conf import settings
import google.generativeai as genai
from hirelense_backend.apps.candidates.models import CandidateScoreDetail, CandidateTranscriptLine

logger = logging.getLogger(__name__)

class CandidateEvaluationService:
    @staticmethod
    def evaluate_interview(candidate, answers, mcq_answers, flow, scorecard):
        # Delete existing transcript and scorecard detail records at the start of evaluation to prevent duplicates
        candidate.transcript.all().delete()
        candidate.scores.all().delete()

        # 1. Collect all questions and candidate answers from flow rounds
        descriptive_questions = []
        mcq_results = []
        
        # Keep track of which question maps to which parameter
        parameter_scores_map = {}
        
        if not flow:
            logger.warning(f"No interview flow found for candidate {candidate.id}.")
            return False
            
        for round_item in flow.rounds.all():
            from hirelense_backend.apps.pools.models import QuestionPool
            pool = QuestionPool.objects.filter(flow=flow, category=round_item.type).first()
            if not pool:
                continue

            # Build flat list of MCQs for this round (dynamic round check)
            flat_mcqs = []
            for q in pool.questions.all():
                try:
                    parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                except Exception:
                    parsed = {}
                
                is_mcq_q = (
                    round_item.type == 'mcq' or 
                    parsed.get('type') == 'MCQ' or 
                    parsed.get('type') == 'mcq' or 
                    len(parsed.get('mcqs', [])) > 0 or 
                    len(parsed.get('options', [])) > 0
                )
                
                if is_mcq_q:
                    mcqs = parsed.get('mcqs', [])
                    if isinstance(mcqs, list) and len(mcqs) > 0:
                        for m in mcqs:
                            opts = m.get("options", [])
                            if not opts:
                                opts = parsed.get("options", [])
                            flat_mcqs.append({
                                "question_text": m.get("question", "") or q.question_text,
                                "options": opts,
                                "correct_answer": m.get("correctAnswer") if m.get("correctAnswer") is not None else m.get("answer"),
                                "parameter": q.feeds_parameter or "Domain knowledge",
                                "marks": int(m.get('marks', 10)),
                                "pool_q_id": q.id
                            })
                    else:
                        flat_mcqs.append({
                            "question_text": q.question_text,
                            "options": parsed.get("options", []),
                            "correct_answer": parsed.get("answer"),
                            "parameter": q.feeds_parameter or "Domain knowledge",
                            "marks": int(parsed.get('marks', 10)),
                            "pool_q_id": q.id
                        })

            # Track all question IDs processed as MCQ to skip them in the descriptive loop
            processed_as_mcq_ids = set(fm['pool_q_id'] for fm in flat_mcqs)

            # Compute round label for storing in transcript
            round_order = getattr(round_item, 'order', 0)
            round_name = getattr(round_item, 'name', None) or round_item.type.title()
            round_label = f"Round {round_order + 1}: {round_name}"

            # Now evaluate the programmatically graded MCQs for this round
            for i, flat_mcq in enumerate(flat_mcqs):
                # Try multiple key formats: sequential index (from frontend), pool question id
                selected_val = mcq_answers.get(str(i))
                if selected_val is None:
                    selected_val = mcq_answers.get(i)
                if selected_val is None:
                    selected_val = mcq_answers.get(str(flat_mcq.get('pool_q_id', '')))
                
                # Check options
                options_list = flat_mcq.get("options", [])
                clean_options = []
                if isinstance(options_list, list):
                    for opt in options_list:
                        if isinstance(opt, dict):
                            clean_options.append(str(opt.get('text', opt)))
                        else:
                            clean_options.append(str(opt))
                elif isinstance(options_list, dict):
                    clean_options = [str(v) for v in options_list.values()]
                
                # If clean_options is empty, fall back to mock options to prevent format errors
                if len(clean_options) == 0:
                    clean_options = ["Option A", "Option B", "Option C", "Option D"]
                
                # Correct answer text mapping
                correct_ans = flat_mcq["correct_answer"]
                if correct_ans is None or str(correct_ans).strip() == "":
                    correct_ans = 0
                try:
                    if str(correct_ans).isdigit() and int(correct_ans) < len(clean_options):
                        flat_mcq["correct_answer_text"] = clean_options[int(correct_ans)]
                    else:
                        flat_mcq["correct_answer_text"] = str(correct_ans)
                except Exception:
                    flat_mcq["correct_answer_text"] = str(correct_ans)
                
                if selected_val is not None and str(selected_val).strip() != '':
                    try:
                        selected_idx = int(selected_val)
                    except (ValueError, TypeError):
                        selected_idx = -1
                    
                    if selected_idx >= 0 and selected_idx < len(clean_options):
                        ans_text = clean_options[selected_idx]
                    else:
                        ans_text = f"[Invalid option index: {selected_idx}]"
                    
                    is_correct = False
                    if str(selected_idx) == str(correct_ans):
                        is_correct = True
                    elif str(correct_ans).isdigit() and str(selected_idx) == str(correct_ans):
                        is_correct = True
                    elif chr(65 + selected_idx) == str(correct_ans).upper():
                        is_correct = True
                    elif str(ans_text).strip().lower() == str(correct_ans).strip().lower():
                        is_correct = True
                    
                    score_val = 10.0 if is_correct else 0.0
                else:
                    ans_text = "[No Answer / Skipped]"
                    score_val = 0.0
                
                mcq_results.append({
                    "question_text": flat_mcq["question_text"],
                    "answer_text": ans_text,
                    "expected_answer": flat_mcq.get("correct_answer_text", ""),
                    "score_value": score_val,
                    "parameter": flat_mcq["parameter"],
                    "marks": flat_mcq.get("marks", 10),
                    "round_label": round_label
                })
                
                # Accumulate score for parameter
                param_name = flat_mcq["parameter"]
                if param_name not in parameter_scores_map:
                    parameter_scores_map[param_name] = []
                parameter_scores_map[param_name].append(score_val)

            # Now collect descriptive questions for this round (skip those already handled as MCQ)
            for q in pool.questions.all():
                if q.id in processed_as_mcq_ids:
                    continue  # Already processed as MCQ, skip
                try:
                    parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                except Exception:
                    parsed = {}

                is_mcq_q = (
                    round_item.type == 'mcq' or
                    parsed.get('type') == 'MCQ' or
                    parsed.get('type') == 'mcq' or
                    len(parsed.get('mcqs', [])) > 0 or
                    len(parsed.get('options', [])) > 0
                )

                if not is_mcq_q:
                    ans_key = f"q-{q.id}"
                    user_ans = answers.get(ans_key, {})
                    ans_text = user_ans.get('answer') if isinstance(user_ans, dict) else None

                    expected_text = ""
                    try:
                        expected_text = parsed.get("answer", "")
                        max_marks = int(parsed.get("marks", 10))
                    except Exception:
                        expected_text = q.marking_guide or ""
                        max_marks = 10

                    clean_ans = str(ans_text).strip() if ans_text else ""
                    # Use real candidate answer only — never inject fake content
                    if not clean_ans or clean_ans.lower().startswith("candidate's verbal explanation for"):
                        clean_ans = "[No verbal response recorded]"

                    if not expected_text:
                        expected_text = "[No expected answer configured]"

                    descriptive_questions.append({
                        "id": q.id,
                        "question_text": q.question_text,
                        "expected_answer": expected_text,
                        "candidate_answer": clean_ans,
                        "feeds_parameter": q.feeds_parameter or "Communication",
                        "marks": max_marks,
                        "round_label": round_label
                    })



        # 2. Get Scorecard parameters to score
        scorecard_params = []
        if scorecard:
            scorecard_params = list(scorecard.parameters.all())
        else:
            # Fallback default parameters
            default_params = [
                ('Domain knowledge', 30),
                ('Communication', 30),
                ('Problem Solving', 40)
            ]
            # Create transient parameter-like objects or just dicts for prompt
            scorecard_params = [{'name': name, 'weight': weight} for name, weight in default_params]

        # 3. Attempt Gemini Flash evaluation if API key is configured
        gemini_success = False
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        
        if api_key and len(descriptive_questions) > 0:
            try:
                logger.info(f"Attempting Gemini Flash evaluation for candidate {candidate.id}...")
                genai.configure(api_key=api_key)
                
                # We use gemini-1.5-flash as the active model name
                model = genai.GenerativeModel('gemini-1.5-flash')


                
                # Format parameters for the prompt
                params_str = "\n".join([
                    f"- {p.name if hasattr(p, 'name') else p['name']} (Weight: {p.weight if hasattr(p, 'weight') else p['weight']}%): Evaluate this skill based on candidate answers." 
                    for p in scorecard_params
                ])
                
                # Format questions and answers for the prompt
                questions_str = ""
                for idx, dq in enumerate(descriptive_questions):
                    questions_str += f"""
---
Question ID: {dq['id']}
Question Text: {dq['question_text']}
Ideal/Expected Answer: {dq['expected_answer']}
Candidate Answer: {dq['candidate_answer']}
Feeds Parameter: {dq['feeds_parameter']}
"""

                # Format already-graded MCQs for background context
                mcq_str = ""
                if len(mcq_results) > 0:
                    mcq_str = "\nMCQ Questions already graded programmatically (for your general overview):\n"
                    for mr in mcq_results:
                        mcq_str += f"- Question: {mr['question_text']} | Score: {mr['score_value']}/10 | Parameter: {mr['parameter']}\n"

                prompt = f"""
You are an expert AI recruiting system evaluating an interview for the job opening: "{candidate.opening.title if candidate.opening else "Generic Role"}".
Candidate name: "{candidate.name}"

Here are the parameters defined in the scorecard for this role:
{params_str}

Evaluate the candidate's descriptive answers against the expected answers.
Compare the candidate's answer to the expected answer to see if they demonstrate correct understanding of the core concept.
Be highly flexible and intelligent: even if the candidate's answer does not strictly match the expected answer's phrasing or precise details, if their answer is technically correct, logical, and correctly answers the question, grade them highly. Assess whether the candidate's response is correct in the context of the question itself, rather than strictly comparing it word-for-word against the expected answer text.

Descriptive Questions and Answers:
{questions_str}
{mcq_str}

You must return your output in the following JSON format:
{{
  "question_evaluations": [
    {{
      "question_id": "string (the ID provided above)",
      "score_val": float (0.0 to 10.0),
      "feedback": "string (brief justification of the score)"
    }}
  ],
  "parameter_evaluations": [
    {{
      "parameter_name": "string (matching the scorecard parameter name exactly)",
      "score_val": float (0.0 to 10.0),
      "feedback": "string (brief synthesis of candidate's skill in this parameter)"
    }}
  ],
  "overall_summary": "string (brief, professional AI summary of the candidate's overall performance)"
}}

Do not include any thinking, explanations, or code blocks outside the JSON. Return only a valid JSON string. Ensure any nested double quotes inside the string values are properly escaped (e.g. use \" instead of raw ").
"""
                response = model.generate_content(
                    prompt,
                    generation_config={
                        "response_mime_type": "application/json"
                    }
                )
                
                # Parse output robustly
                text_content = response.text.strip()
                if text_content.startswith("```"):
                    text_content = re.sub(r"^```[a-zA-Z]*\n", "", text_content)
                    text_content = re.sub(r"\n```$", "", text_content)
                text_content = text_content.strip()
                
                eval_data = json.loads(text_content)
                
                # Process question evaluations
                descriptive_evals_map = {
                    str(q_ev.get("question_id")): q_ev
                    for q_ev in eval_data.get("question_evaluations", [])
                }
                
                for dq in descriptive_questions:
                    q_ev = descriptive_evals_map.get(str(dq["id"]))
                    score_val = 7.0 # Default fallback for single question
                    if q_ev:
                        try:
                            score_val = float(q_ev.get("score_val", 7.0))
                            score_val = max(0.0, min(10.0, score_val))
                        except ValueError:
                            pass
                            
                    CandidateTranscriptLine.objects.create(
                        candidate=candidate,
                        question_text=dq["question_text"],
                        timestamp="Descriptive",
                        answer_text=dq["candidate_answer"],
                        expected_answer=dq.get("expected_answer", ""),
                        score_value=score_val,
                        feedback=dq.get("round_label", "Interview Round")
                    )
                    
                    param_name = dq["feeds_parameter"]
                    if param_name not in parameter_scores_map:
                        parameter_scores_map[param_name] = []
                    parameter_scores_map[param_name].append(score_val)
                    
                # Process parameter evaluations
                parameter_evals_map = {
                    p_ev.get("parameter_name"): p_ev
                    for p_ev in eval_data.get("parameter_evaluations", [])
                }
                
                total_weight = 0
                weighted_score_sum = 0
                
                for param in scorecard_params:
                    p_name = param.name if hasattr(param, 'name') else param['name']
                    p_ev = parameter_evals_map.get(p_name)
                    score_val = None
                    if p_ev:
                        try:
                            score_val = float(p_ev.get("score_val"))
                            score_val = max(0.0, min(10.0, score_val))
                        except (ValueError, TypeError):
                            pass
                    if score_val is None:
                        q_scores = parameter_scores_map.get(p_name, [])
                        if q_scores:
                            score_val = round(sum(q_scores) / len(q_scores), 1)
                        else:
                            all_scores = [s for scores in parameter_scores_map.values() for s in scores]
                            score_val = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0
                    CandidateScoreDetail.objects.create(
                        candidate=candidate,
                        parameter_name=p_name,
                        score_value=score_val
                    )
                    
                # Calculate total earned marks based on marks per question
                total_earned_marks = 0.0
                total_max_marks = 0
                
                # Add descriptive questions to total
                for dq in descriptive_questions:
                    max_m = dq.get('marks', 10)
                    total_max_marks += max_m
                    # Find the score_val given by Gemini
                    q_score = 0.0
                    for ev in eval_data.get("question_evaluations", []):
                        if str(ev.get("question_id")) == str(dq['id']):
                            try:
                                q_score = float(ev.get("score_val", 0.0))
                            except:
                                q_score = 0.0
                            break
                    total_earned_marks += (q_score / 10.0) * max_m

                # Add MCQ questions to total
                for mr in mcq_results:
                    max_m = mr.get('marks', 10)
                    total_max_marks += max_m
                    total_earned_marks += (mr.get('score_value', 0.0) / 10.0) * max_m
                    
                    CandidateTranscriptLine.objects.create(
                        candidate=candidate,
                        question_text=mr["question_text"],
                        timestamp="MCQ",
                        answer_text=mr["answer_text"],
                        expected_answer=mr.get("expected_answer", ""),
                        score_value=mr["score_value"],
                        feedback=mr.get("round_label", "MCQ Round")
                    )
                    
                # Save overall score and summary
                import json
                candidate.score = int(round(total_earned_marks))
                meta = {}
                try:
                    if candidate.meta_info:
                        meta = json.loads(candidate.meta_info)
                except:
                    pass
                meta['total_score'] = total_max_marks if total_max_marks > 0 else 100
                candidate.meta_info = json.dumps(meta)
                
                threshold_pct = scorecard.auto_reject_threshold if scorecard else 50
                pct = (candidate.score / meta['total_score']) * 100 if meta['total_score'] > 0 else 0
                
                if pct >= threshold_pct:
                    candidate.status = 'Shortlisted'
                else:
                    candidate.status = 'Scored'
                    
                candidate.ai_summary = eval_data.get("overall_summary", f"Candidate completed interview. Shows solid performance with a score of {candidate.score}/{meta['total_score']}.")
                candidate.save()
                
                gemini_success = True
                logger.info(f"Gemini Flash evaluation completed successfully for candidate {candidate.id}.")
                
            except Exception as e:
                logger.error(f"Gemini evaluation failed: {str(e)}. Falling back to heuristic scoring.", exc_info=True)
                # Clear any partially created transcript and score lines before running the fallback block
                candidate.transcript.all().delete()
                candidate.scores.all().delete()
                gemini_success = False

        # 4. Fallback Heuristic Grading (if Gemini failed or was not configured)
        if not gemini_success:
            logger.warning(f"Using fallback heuristic grading for candidate {candidate.id}.")
            
            # Grade remaining descriptive questions using word-overlap heuristic
            for dq in descriptive_questions:
                expected_text = dq["expected_answer"]
                clean_ans = dq["candidate_answer"]
                
                if expected_text and expected_text != "[No expected answer configured]":
                    words_ans = set(re.findall(r'\w+', clean_ans.lower()))
                    words_exp = set(re.findall(r'\w+', expected_text.lower()))
                    if words_exp:
                        overlap = len(words_ans.intersection(words_exp)) / len(words_exp)
                        score_val = round(overlap * 10.0, 1)
                    else:
                        score_val = 7.0
                else:
                    score_val = 5.0 if clean_ans == "[No verbal response recorded]" else 7.0
                    
                CandidateTranscriptLine.objects.create(
                    candidate=candidate,
                    question_text=dq["question_text"],
                    timestamp="Descriptive",
                    answer_text=clean_ans,
                    expected_answer=dq.get("expected_answer", ""),
                    score_value=score_val,
                    feedback=dq.get("round_label", "Interview Round")
                )
                
                param_name = dq["feeds_parameter"]
                if param_name not in parameter_scores_map:
                    parameter_scores_map[param_name] = []
                parameter_scores_map[param_name].append(score_val)

            # Create MCQ transcript records that were computed earlier
            for mr in mcq_results:
                CandidateTranscriptLine.objects.create(
                    candidate=candidate,
                    question_text=mr["question_text"],
                    timestamp="MCQ",
                    answer_text=mr["answer_text"],
                    expected_answer=mr.get("expected_answer", ""),
                    score_value=mr["score_value"],
                    feedback=mr.get("round_label", "MCQ Round")
                )

            # Evaluate scorecard parameter averages
            total_weight = 0
            weighted_score_sum = 0
            
            for param in scorecard_params:
                p_name = param.name if hasattr(param, 'name') else param['name']
                q_scores = parameter_scores_map.get(p_name, [])
                if q_scores:
                    score_val = round(sum(q_scores) / len(q_scores), 1)
                else:
                    all_scores = [s for scores in parameter_scores_map.values() for s in scores]
                    score_val = round(sum(all_scores) / len(all_scores), 1) if all_scores else 7.0
                    
                CandidateScoreDetail.objects.create(
                    candidate=candidate,
                    parameter_name=p_name,
                    score_value=score_val
                )
                
            # Calculate total earned marks based on marks per question
            total_earned_marks = 0.0
            total_max_marks = 0
            
            # Add descriptive questions to total
            for dq in descriptive_questions:
                max_m = dq.get('marks', 10)
                total_max_marks += max_m
                
                expected_text = dq["expected_answer"]
                clean_ans = dq["candidate_answer"]
                q_score = 5.0
                if expected_text and expected_text != "[No expected answer configured]":
                    words_ans = set(re.findall(r'\w+', clean_ans.lower()))
                    words_exp = set(re.findall(r'\w+', expected_text.lower()))
                    if words_exp:
                        overlap = len(words_ans.intersection(words_exp)) / len(words_exp)
                        q_score = round(overlap * 10.0, 1)
                total_earned_marks += (q_score / 10.0) * max_m

            # Add MCQ questions to total
            for mr in mcq_results:
                max_m = mr.get('marks', 10)
                total_max_marks += max_m
                total_earned_marks += (mr.get('score_value', 0.0) / 10.0) * max_m
                
            # Save overall score and summary
            import json
            candidate.score = int(round(total_earned_marks))
            meta = {}
            try:
                if candidate.meta_info:
                    meta = json.loads(candidate.meta_info)
            except:
                pass
            meta['total_score'] = total_max_marks if total_max_marks > 0 else 100
            candidate.meta_info = json.dumps(meta)
            
            threshold_pct = scorecard.auto_reject_threshold if scorecard else 50
            pct = (candidate.score / meta['total_score']) * 100 if meta['total_score'] > 0 else 0
            
            if pct >= threshold_pct:
                candidate.status = 'Shortlisted'
            else:
                candidate.status = 'Scored'
            
            # Build meaningful dynamic summary
            total_qs = len(descriptive_questions) + len(mcq_results)
            mcq_correct = sum(1 for mr in mcq_results if mr.get('score_value', 0) >= 10.0)
            num_rounds = len(set(mr.get('round_label', '') for mr in mcq_results) | set(dq.get('round_label', '') for dq in descriptive_questions))
            candidate.ai_summary = (
                f"Candidate completed automated screening with {total_qs} question(s) across {num_rounds} round(s). "
                f"MCQ score: {mcq_correct}/{len(mcq_results)} correct. "
                f"Overall: {candidate.score}/{meta['total_score']} ({pct:.0f}%). "
                f"(Heuristic evaluation — Gemini API was unavailable for this assessment)"
            )
            candidate.save()

        return True
