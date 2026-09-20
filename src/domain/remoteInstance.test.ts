import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeRemoteOrigin } from './remoteInstance';

describe('normalizeRemoteOrigin', () => {
    it('ramène une adresse à son origine', () => {
        assert.equal(
            normalizeRemoteOrigin(' https://DevEye.Exemple.fr/ '),
            'https://deveye.exemple.fr'
        );
        assert.equal(
            normalizeRemoteOrigin('https://deveye.exemple.fr:443'),
            'https://deveye.exemple.fr'
        );
        assert.equal(normalizeRemoteOrigin('http://10.0.0.4:3000'), 'http://10.0.0.4:3000');
    });

    it('refuse tout ce qui déborderait dans un en-tête CSP', () => {
        for (const input of [
            'deveye.exemple.fr',
            'ftp://deveye.exemple.fr',
            'https://*.exemple.fr',
            'https://user:pass@exemple.fr',
            'https://exemple.fr/chemin',
            'https://exemple.fr/?q=1',
            'https://exemple.fr/#a',
            'https://[::1]:3000',
            "https://exemple.fr; script-src 'unsafe-inline'",
            'https://exemple.fr evil.example'
        ]) {
            assert.equal(normalizeRemoteOrigin(input), null, input);
        }
    });
});
