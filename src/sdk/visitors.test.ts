import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    looksLikeBot,
    normalizeReferrer,
    originHost,
    parseUserAgent,
    visitorRef
} from './visitors';

describe('originHost and normalizeReferrer', () => {
    it('give the bare host whatever the form, and silence internal navigation', () => {
        assert.equal(originHost('https://Example.com/'), 'example.com');
        assert.equal(originHost('example.com:443/path?q#a'), 'example.com');
        // An IPv6 literal keeps its colons: the port is not split from it.
        assert.equal(originHost('[::1]:3000'), '[::1]:3000');
        assert.equal(
            normalizeReferrer('https://google.com/search?q=x', ['example.com'], 200),
            'google.com'
        );
        assert.equal(normalizeReferrer('https://example.com/page', ['example.com'], 200), null);
        assert.equal(normalizeReferrer(undefined, [], 200), null);
        assert.equal(normalizeReferrer('https://abcdefghij.com', [], 5), 'abcde');
    });
});

describe('visitorRef', () => {
    it('is stable for the same inputs and changes with any of them', () => {
        const ref = visitorRef('salt', 'scope-a', '203.0.113.7', 'UA');
        assert.equal(ref, visitorRef('salt', 'scope-a', '203.0.113.7', 'UA'));
        assert.equal(ref.length, 16);
        assert.notEqual(ref, visitorRef('other', 'scope-a', '203.0.113.7', 'UA'));
        assert.notEqual(ref, visitorRef('salt', 'scope-b', '203.0.113.7', 'UA'));
        assert.notEqual(ref, visitorRef('salt', 'scope-a', '203.0.113.8', 'UA'));
        assert.notEqual(ref, visitorRef('salt', 'scope-a', '203.0.113.7', 'UB'));
    });
});

describe('parseUserAgent and looksLikeBot', () => {
    it('go from the most specific to the most general', () => {
        const edge =
            'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0';
        const androidTablet =
            'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
        const iphone =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
        assert.deepEqual(parseUserAgent(edge), {
            browser: 'Edge',
            os: 'Windows',
            device: 'desktop'
        });
        assert.deepEqual(parseUserAgent(androidTablet), {
            browser: 'Chrome',
            os: 'Android',
            device: 'tablet'
        });
        assert.deepEqual(parseUserAgent(iphone), {
            browser: 'Safari',
            os: 'iOS',
            device: 'mobile'
        });
        assert.deepEqual(parseUserAgent(''), { browser: null, os: null, device: 'desktop' });
        assert.deepEqual(parseUserAgent('SomethingElse/1.0'), {
            browser: null,
            os: null,
            device: 'desktop'
        });
        assert.equal(looksLikeBot('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
        assert.equal(looksLikeBot('Slackbot-LinkExpanding 1.0'), true);
        assert.equal(looksLikeBot(edge), false);
        assert.equal(looksLikeBot(undefined), false);
    });
});
