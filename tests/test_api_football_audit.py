"""Offline tests; never call the live API."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import api_football_audit as a


class FakeApi:
    def __init__(self, answers):
        self.answers = answers
        self.calls = []

    def get(self, endpoint, **params):
        self.calls.append((endpoint, params))
        key = (endpoint, tuple(sorted(params.items())))
        return self.answers.get(key, ([], {'current': 1, 'total': 1}))


class AuditTests(unittest.TestCase):
    def test_turkish_normalization_and_club_alias(self):
        self.assertEqual(a.norm('BEŞİKTAŞ'), 'besiktas')
        self.assertTrue(a.club_match('Karabükspor', 'Kardemir Karabükspor'))
        self.assertFalse(a.club_match('Siirtspor', 'Siirt Jetpaspor'))

    def test_name_and_birth_matching(self):
        p = {'name': 'B. Yılmaz', 'firstname': 'Barış Alper', 'lastname': 'Yılmaz',
             'birth': {'date': '2000-05-23'}}
        self.assertTrue(a.name_match(p, {'aliases': ['Barış Alper Yılmaz']}))
        self.assertEqual(a.birth_year(p), 2000)

    def test_profile_success_with_duplicate_seasons(self):
        case = {'name': 'Pascal Nouma', 'birth_year': 1972, 'searches': ['Nouma'],
                'aliases': ['Pascal Nouma'], 'expected_clubs': ['Beşiktaş', 'Paris Saint-Germain'],
                'transfer_anchor': 'Besiktas'}
        profile = {'id': 123, 'name': 'P. Nouma', 'firstname': 'Pascal', 'lastname': 'Nouma',
                   'birth': {'date': '1972-01-06'}}
        answers = {
            ('players/profiles', (('page', 1), ('search', 'Nouma'))): ([profile], {'current': 1, 'total': 1}),
            ('players/teams', (('player', 123),)): ([
                {'team': {'id': 1, 'name': 'Besiktas'}, 'seasons': [2000]},
                {'team': {'id': 1, 'name': 'Besiktas'}, 'seasons': [2001]},
                {'team': {'id': 2, 'name': 'Paris Saint-Germain'}, 'seasons': [1996]}], {})}
        result = a.audit_case(FakeApi(answers), case, {})
        self.assertEqual(result['status'], 'confirmed')
        self.assertEqual(result['id'], 123)
        self.assertEqual(result['club_count_in_api'], 2)
        self.assertEqual(len(result['matched_clubs']), 2)

    def test_transfer_fallback(self):
        case = {'name': 'Bobô', 'birth_year': 1985, 'searches': ['Bobo'],
                'aliases': ['Bobo', 'Deyvison Rogerio da Silva'],
                'expected_clubs': ['Beşiktaş'], 'transfer_anchor': 'Besiktas'}
        profile = {'id': 999, 'name': 'Bobo', 'firstname': 'Deyvison Rogerio', 'lastname': 'da Silva',
                   'birth': {'date': '1985-01-09'}}
        answers = {
            ('teams', (('search', 'Besiktas'),)): ([{'team': {'id': 42, 'name': 'Besiktas'}}], {}),
            ('transfers', (('team', 42),)): ([{'player': {'id': 999, 'name': 'Bobo'}}], {}),
            ('players/profiles', (('player', 999),)): ([profile], {}),
            ('players/teams', (('player', 999),)): ([{'team': {'id': 42, 'name': 'Beşiktaş'}}], {})}
        result = a.audit_case(FakeApi(answers), case, {})
        self.assertEqual(result['status'], 'confirmed')
        self.assertEqual(result['source'], 'transfers')
        self.assertEqual(result['id'], 999)


if __name__ == '__main__':
    unittest.main()
