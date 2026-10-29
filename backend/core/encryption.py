import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

MASTER_SECRET = os.getenv("MASTER_ENCRYPTION_SECRET", "outreachbot-default-super-master-key-32b")

def _derive_key(user_id: str) -> bytes:
    kdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=user_id.encode(),
        info=b"outreachbot-smtp-key",
    )
    key_bytes = kdf.derive(MASTER_SECRET.encode())
    return base64.urlsafe_b64encode(key_bytes)

def encrypt_password(plaintext: str, user_id: str) -> str:
    key = _derive_key(user_id)
    f = Fernet(key)
    return f.encrypt(plaintext.encode()).decode()

def decrypt_password(ciphertext: str, user_id: str) -> str:
    key = _derive_key(user_id)
    f = Fernet(key)
    return f.decrypt(ciphertext.encode()).decode()
