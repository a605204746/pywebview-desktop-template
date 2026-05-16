# 加密工具包 — 由 PyArmor 加密编译，防止反编译
from .cipher import encrypt, decrypt, encrypt_str, decrypt_str, safe_decrypt_str
from .license import verify, is_authorized, LicenseInfo, LicenseError
