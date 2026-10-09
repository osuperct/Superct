"""Integration checks for the public/account partner boundary."""
import pathlib
import unittest
import requests


class PartnerPermissions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        env = dict(line.split('=', 1) for line in pathlib.Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
        cls.url = env['VITE_SUPABASE_URL'].strip('"') + '/rest/v1/'
        cls.headers = {'apikey': env['VITE_SUPABASE_PUBLISHABLE_KEY'].strip('"')}

    def test_public_showcase_has_three_original_partners(self):
        response = requests.get(self.url + 'parceiros_ct?select=nome&ativo=eq.true', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue({'Dany Baby Kids', 'Musicativar', 'Thassia Tamaso'}.issubset({row['nome'] for row in response.json()}))

    def test_public_cannot_read_private_offers_and_contacts(self):
        response = requests.get(self.url + 'parceiros_ct_beneficios?select=beneficio,cupom,telefone', headers=self.headers)
        self.assertIn(response.status_code, (401, 403))

    def test_public_cannot_write_partner(self):
        response = requests.patch(self.url + 'parceiros_ct?id=eq.10000000-0000-4000-8000-000000000001', headers=self.headers, json={'nome': 'Dany Baby Kids'})
        self.assertIn(response.status_code, (401, 403))


if __name__ == '__main__':
    unittest.main()