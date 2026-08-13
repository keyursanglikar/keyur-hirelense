from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model
User = get_user_model()
import logging

logger = logging.getLogger(__name__)

class BaseEmailProvider:
    def send_email(self, recipient, subject, html_body, text_body):
        raise NotImplementedError("Subclasses must implement send_email method")

class ConsoleEmailProvider(BaseEmailProvider):
    def send_email(self, recipient, subject, html_body, text_body):
        import sys
        try:
            sys.stdout.write(f"\n======================================================================\n")
            sys.stdout.write(f"EMAIL DISPATCH PREVIEW (CONSOLE)\n")
            sys.stdout.write(f"To: {recipient}\n")
            sys.stdout.write(f"Subject: {subject}\n")
            sys.stdout.write(f"----------------------------------------------------------------------\n")
            sys.stdout.write(f"{text_body}\n")
            sys.stdout.write(f"======================================================================\n\n")
            sys.stdout.flush()
        except Exception:
            pass
        return {"status": "success", "provider": "console", "response": "Dispatched to console"}

class SMTPEmailProvider(BaseEmailProvider):
    def send_email(self, recipient, subject, html_body, text_body):
        from django.core.mail import get_connection
        logger.info("Email sending function entered: SMTPEmailProvider.send_email")
        logger.info(f"SMTP connection started: Connecting to {settings.EMAIL_HOST}:{settings.EMAIL_PORT} as {settings.EMAIL_HOST_USER}")
        connection = get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=settings.EMAIL_USE_TLS,
            fail_silently=False
        )
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
            connection=connection
        )
        msg.attach_alternative(html_body, "text/html")
        logger.info("Attempting to send email via SMTP message dispatch...")
        msg.send(fail_silently=False)
        logger.info("Email successfully sent to SMTP relay!")
        return {"status": "success", "provider": "smtp", "response": "Dispatched via SMTP"}


class EmailJSEmailProvider(BaseEmailProvider):
    def send_email(self, recipient, subject, html_body, text_body, context=None):
        import urllib.request
        import urllib.error
        import json
        
        # Prepare template params (adding multiple aliases for recipient to guarantee it is not empty)
        template_params = {
            "to_email": recipient,
            "email": recipient,
            "to": recipient,
            "candidate_email": recipient,
            "to_name": context.get("candidate_name", "") if context else "",
            "subject": subject,
            "message": text_body,
        }
        if context:
            template_params.update(context)
            # Re-enforce recipient email aliases
            recipient_email = context.get("candidate_email", recipient)
            template_params["to_email"] = recipient_email
            template_params["email"] = recipient_email
            template_params["to"] = recipient_email
            template_params["candidate_email"] = recipient_email
            template_params["to_name"] = context.get("candidate_name", "")

        payload = {
            "service_id": getattr(settings, 'EMAILJS_SERVICE_ID', ''),
            "template_id": getattr(settings, 'EMAILJS_TEMPLATE_ID', ''),
            "user_id": getattr(settings, 'EMAILJS_PUBLIC_KEY', ''),
            "template_params": template_params
        }
        
        private_key = getattr(settings, 'EMAILJS_PRIVATE_KEY', '')
        if private_key:
            payload["accessToken"] = private_key

        url = "https://api.emailjs.com/api/v1.0/email/send"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        )
        
        logger.info(f"EmailJS sending started: dispatching invitation to {recipient} using service {payload['service_id']}")
        try:
            with urllib.request.urlopen(req) as response:
                status_code = response.status
                res_body = response.read().decode('utf-8')
                if status_code == 200:
                    logger.info("Email successfully sent via EmailJS!")
                    return {"status": "success", "provider": "emailjs", "response": res_body}
                else:
                    raise Exception(f"HTTP {status_code}: {res_body}")
        except urllib.error.HTTPError as e:
            res_body = e.read().decode('utf-8')
            raise Exception(f"EmailJS HTTP error {e.code}: {res_body}")

class EmailProviderFactory:
    @staticmethod
    def get_provider():
        import sys
        # If running unit tests, use the console provider to keep tests offline, fast, and mocked.
        if 'test' in sys.argv or 'test_coverage' in sys.argv:
            return ConsoleEmailProvider()

        provider_name = getattr(settings, 'EMAIL_PROVIDER', 'console').lower()
        if provider_name == 'smtp':
            return SMTPEmailProvider()
        elif provider_name == 'emailjs':
            return EmailJSEmailProvider()
        return ConsoleEmailProvider()

class EmailService:
    @staticmethod
    def send(recipient, subject, html_body, text_body, context=None):
        provider = EmailProviderFactory.get_provider()
        try:
            import inspect
            sig = inspect.signature(provider.send_email)
            if 'context' in sig.parameters:
                result = provider.send_email(recipient, subject, html_body, text_body, context=context)
            else:
                result = provider.send_email(recipient, subject, html_body, text_body)
                
            return {
                "success": True,
                "provider": result.get("provider", "unknown"),
                "response": result.get("response", ""),
                "error": None
            }
        except Exception as e:
            logger.exception("Failed to send email to %s", recipient)
            return {
                "success": False,
                "provider": getattr(settings, 'EMAIL_PROVIDER', 'console'),
                "response": None,
                "error": str(e)
            }
