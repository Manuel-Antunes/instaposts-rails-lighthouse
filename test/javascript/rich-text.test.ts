// The #hashtags and @mentions a caption or a comment shows as links: the rule Rails tags posts with.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { richTextParts } from '../../app/javascript/lib/rich-text.ts'

const linked = (text: string) => richTextParts(text).flatMap((part) => (part.kind === 'hashtag' ? [`#${part.name}`] : part.kind === 'mention' ? [`@${part.username}`] : []))

test('the parts put back together are the text as written', () => {
  const text = 'Lisbon with @Ana.Souza! #Travel #café\n\n#rails8, again'
  assert.equal(
    richTextParts(text)
      .map((part) => part.text)
      .join(''),
    text,
  )
})

test('hashtags are stored lowercase, unicode letters included', () => {
  assert.deepEqual(linked('#Travel #café #Rails8 #São_Paulo'), ['#travel', '#café', '#rails8', '#são_paulo'])
  assert.deepEqual(linked('#cafe\u0301'), ['#café'], 'an accent typed apart is the same tag')
})

test('a hashtag needs a letter, and a # inside a word or a URL is not one', () => {
  assert.deepEqual(linked('#2026 C# html&#39; example.com/#anchor a#b ##double'), [])
})

test('punctuation ends a hashtag', () => {
  assert.deepEqual(linked('(#rails), #ruby. #graphql!'), ['#rails', '#ruby', '#graphql'])
})

test('a mention never ends in a period, and an email is not one', () => {
  assert.deepEqual(linked('thanks @ana. and @bruno_lima, write to ana@acme.inc'), ['@ana', '@bruno_lima'])
})

test('text without tags is one part', () => {
  assert.deepEqual(richTextParts('Small steps, every day.'), [{ kind: 'text', text: 'Small steps, every day.' }])
  assert.deepEqual(richTextParts(''), [])
})
