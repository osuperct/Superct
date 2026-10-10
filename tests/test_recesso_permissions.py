"""Recess consent audit records cannot be forged through the public API."""
import pathlib
import unittest
import requests

class RecessoPermissions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        env = dict(line.split('=', 1) for line in pathlib.Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
        cls.url = env['VITE_SUPABASE_URL'].strip('"') + '/rest/v1/'
        cls.headers = {'apikey': env['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')}

    def test_public_cannot_read_consents(self):
        response = requests.get(self.url + 'recesso_aceites?select=id', headers=self.headers)
        if response.status_code == 200:
            self.assertEqual(response.json(), [])
        else:
            self.assertIn(response.status_code, (401, 403))

    def test_public_cannot_read_biometric_challenges(self):
        response = requests.get(self.url + 'recesso_desafios?select=id', headers=self.headers)
        if response.status_code == 200:
            self.assertEqual(response.json(), [])
        else:
            self.assertIn(response.status_code, (401, 403))

    def test_public_cannot_forge_signed_addendum(self):
        response = requests.post(self.url + 'rpc/recesso_arquivar', headers=self.headers, json={
            '_desafio': '10000000-0000-4000-8000-000000000001', '_user_id': '10000000-0000-4000-8000-000000000001',
            '_credencial': 'test', '_ip': '127.0.0.1', '_agente': 'test', '_email': 'test@example.org', '_nome': 'test', '_arquivos': []})
        self.assertIn(response.status_code, (401, 403))

if __name__ == '__main__':
    unittest.main()