import re
import os

file_path = r"f:\FREELANCE\NZ-Solutions\keyur-hirelense-final\ca-saas-platform\backend\hirelense_backend\apps\candidates\services.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to compute total_max_marks and total_earned_marks

# 1. Parse max_marks from marking_guide for MCQs
mcq_parse_target = '''                    try:
                        parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                    except Exception:
                        parsed = {}
                    mcqs = parsed.get('mcqs', [])'''
mcq_parse_replacement = '''                    try:
                        parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                    except Exception:
                        parsed = {}
                    mcqs = parsed.get('mcqs', [])
                    max_marks = int(parsed.get('marks', 10))'''
content = content.replace(mcq_parse_target, mcq_parse_replacement)

mcq_flat_target = '''                        flat_mcqs.append({
                            "id": q.id,
                            "question_text": q.question_text,
                            "options": q.options,
                            "correct_option": q.correct_option,
                            "parameter": q.feeds_parameter or "Domain knowledge"
                        })'''
mcq_flat_replacement = '''                        flat_mcqs.append({
                            "id": q.id,
                            "question_text": q.question_text,
                            "options": q.options,
                            "correct_option": q.correct_option,
                            "parameter": q.feeds_parameter or "Domain knowledge",
                            "marks": max_marks
                        })'''
content = content.replace(mcq_flat_target, mcq_flat_replacement)

mcq_flat_target2 = '''                        flat_mcqs.append({
                            "question_text": q.question_text,
                            "options": parsed.get("options", []),
                            "correct_answer": parsed.get("answer"),
                            "parameter": q.feeds_parameter or "Domain knowledge"
                        })'''
mcq_flat_replacement2 = '''                        flat_mcqs.append({
                            "question_text": q.question_text,
                            "options": parsed.get("options", []),
                            "correct_answer": parsed.get("answer"),
                            "parameter": q.feeds_parameter or "Domain knowledge",
                            "marks": max_marks
                        })'''
content = content.replace(mcq_flat_target2, mcq_flat_replacement2)


mcq_score_target = '''                        score_val = 10.0 if is_correct else 0.0
                    else:
                        ans_text = "[No Answer / Skipped]"
                        score_val = 0.0
                        
                    mcq_results.append({
                        "question_text": flat_mcq["question_text"],
                        "answer_text": ans_text,
                        "score_value": score_val,
                        "parameter": flat_mcq["parameter"]
                    })'''
mcq_score_replacement = '''                        score_val = 10.0 if is_correct else 0.0
                    else:
                        ans_text = "[No Answer / Skipped]"
                        score_val = 0.0
                        
                    mcq_results.append({
                        "question_text": flat_mcq["question_text"],
                        "answer_text": ans_text,
                        "score_value": score_val,
                        "parameter": flat_mcq["parameter"],
                        "marks": flat_mcq.get("marks", 10)
                    })'''
content = content.replace(mcq_score_target, mcq_score_replacement)

# 2. Parse max_marks from marking_guide for Descriptive
desc_parse_target = '''                    try:
                        parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                        expected_text = parsed.get("answer", "")
                    except Exception:
                        expected_text = q.marking_guide or ""'''
desc_parse_replacement = '''                    try:
                        parsed = json.loads(q.marking_guide) if q.marking_guide else {}
                        expected_text = parsed.get("answer", "")
                        max_marks = int(parsed.get("marks", 10))
                    except Exception:
                        expected_text = q.marking_guide or ""
                        max_marks = 10'''
content = content.replace(desc_parse_target, desc_parse_replacement)

desc_flat_target = '''                        descriptive_questions.append({
                            "id": q.id,
                            "question_text": q.question_text,
                            "expected_answer": expected_text,
                            "candidate_answer": clean_ans,
                            "feeds_parameter": q.feeds_parameter or "Communication"
                        })'''
desc_flat_replacement = '''                        descriptive_questions.append({
                            "id": q.id,
                            "question_text": q.question_text,
                            "expected_answer": expected_text,
                            "candidate_answer": clean_ans,
                            "feeds_parameter": q.feeds_parameter or "Communication",
                            "marks": max_marks
                        })'''
content = content.replace(desc_flat_target, desc_flat_replacement)


# 3. Overall scoring logic (Gemini)
gemini_score_target = '''                for param in scorecard_params:
                    p_name = param.name if hasattr(param, 'name') else param['name']
                    p_weight = param.weight if hasattr(param, 'weight') else param['weight']
                    
                    p_ev = parameter_evals_map.get(p_name)
                    score_val = None
                    if p_ev:
                        try:
                            score_val = float(p_ev.get("score_val"))
                            score_val = max(0.0, min(10.0, score_val))
                        except (ValueError, TypeError):
                            pass
                            
                    # If Gemini did not return a valid score for this parameter, average the question scores
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
                    weighted_score_sum += score_val * p_weight
                    total_weight += p_weight
                    
                # Save overall score and summary
                overall_score = round(weighted_score_sum / total_weight, 0) if total_weight > 0 else 0
                candidate.score = int(overall_score * 10)
                if candidate.score > 100:
                    candidate.score = 100
                    
                threshold = scorecard.auto_reject_threshold if scorecard else 50
                if candidate.score >= threshold:
                    candidate.status = 'Shortlisted'
                else:
                    candidate.status = 'Scored'
                    
                candidate.ai_summary = eval_data.get("overall_summary", f"Candidate completed interview. Shows solid performance with a score of {overall_score}/10.")
                candidate.save()'''
gemini_score_replacement = '''                for param in scorecard_params:
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
                candidate.save()'''
content = content.replace(gemini_score_target, gemini_score_replacement)


# 4. Overall scoring logic (Fallback)
fallback_score_target = '''            for param in scorecard_params:
                p_name = param.name if hasattr(param, 'name') else param['name']
                p_weight = param.weight if hasattr(param, 'weight') else param['weight']
                
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
                weighted_score_sum += score_val * p_weight
                total_weight += p_weight
                
            overall_score = round(weighted_score_sum / total_weight, 0) if total_weight > 0 else 0
            candidate.score = int(overall_score * 10)
            if candidate.score > 100:
                candidate.score = 100
                
            threshold = scorecard.auto_reject_threshold if scorecard else 50
            if candidate.score >= threshold:
                candidate.status = 'Shortlisted'
            else:
                candidate.status = 'Scored'
                
            candidate.ai_summary = f"Candidate completed automated screening. Shows solid technical domain knowledge with a score of {overall_score}/10. (Heuristic Grading Fallback)"
            candidate.save()'''
fallback_score_replacement = '''            for param in scorecard_params:
                p_name = param.name if hasattr(param, 'name') else param['name']
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
                
                expected_text = dq["expected_answer"]
                clean_ans = dq["candidate_answer"]
                q_score = 7.0
                if expected_text:
                    import re
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
                
            candidate.ai_summary = f"Candidate completed automated screening. Shows solid technical domain knowledge with a score of {candidate.score}/{meta['total_score']}. (Heuristic Grading Fallback)"
            candidate.save()'''
content = content.replace(fallback_score_target, fallback_score_replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("services.py patched successfully!")
