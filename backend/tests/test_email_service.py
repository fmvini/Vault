import asyncio

from app.services import email_service


def test_gmail_sends_with_app_password_and_selected_sender(monkeypatch):
    settings = email_service.settings
    monkeypatch.setattr(settings, "email_provider", "gmail")
    monkeypatch.setattr(settings, "email_from", "Vault <vault.support.admin@gmail.com>")
    monkeypatch.setattr(settings, "gmail_address", "vault.support.admin@gmail.com")
    monkeypatch.setattr(settings, "gmail_app_password", "example-app-password")
    sent = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            assert (host, port, timeout) == ("smtp.gmail.com", 465, 10)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def login(self, address, password):
            assert (address, password) == ("vault.support.admin@gmail.com", "example-app-password")

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setattr(email_service.smtplib, "SMTP_SSL", FakeSMTP)
    result = asyncio.run(email_service.send_email("pessoa@example.com", "Teste", "<p>Olá!</p>"))
    assert result is True
    assert len(sent) == 1
    assert sent[0]["From"] == "Vault <vault.support.admin@gmail.com>"
    assert sent[0]["To"] == "pessoa@example.com"
    assert "<p>Olá!</p>" in sent[0].get_body(preferencelist=("html",)).get_content()


def test_gmail_requires_password_and_matching_sender(monkeypatch):
    settings = email_service.settings
    monkeypatch.setattr(settings, "email_provider", "gmail")
    monkeypatch.setattr(settings, "email_from", "Vault <vault.support.admin@gmail.com>")
    monkeypatch.setattr(settings, "gmail_address", "vault.support.admin@gmail.com")
    monkeypatch.setattr(settings, "gmail_app_password", None)
    assert asyncio.run(email_service.send_email("pessoa@example.com", "Teste", "<p>Oi</p>")) is False
    monkeypatch.setattr(settings, "gmail_app_password", "example-app-password")
    monkeypatch.setattr(settings, "email_from", "Vault <other@gmail.com>")
    assert settings.email_configured is False
