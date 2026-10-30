// How an error of /graphql, or a message of Rails, reaches a form.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CombinedGraphQLErrors } from '@apollo/client'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

import { errorMessage, railsErrors, setServerErrors, validationErrors } from '../../app/javascript/lib/errors.ts'

const graphqlError = (message: string, extensions?: Record<string, unknown>) => new CombinedGraphQLErrors({ data: null, errors: [{ message, extensions }] })
const validation = (fields: Record<string, string[]>) => graphqlError('Validation failed for the field [createPost].', { validation: fields })

// The two things of a form that setServerErrors uses, recording what it is told.
function fakeForm(values: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  const form = { getValues: () => values, setError: (name: string, error: { message: string }) => void (errors[name] = error.message) }
  return { form: form as unknown as UseFormReturn<FieldValues, unknown, FieldValues>, errors }
}

test('Lighthouse validation errors are read by argument path', () => {
  assert.deepEqual(validationErrors(validation({ 'input.name': ["Name can't be blank"] })), { 'input.name': ["Name can't be blank"] })
  assert.equal(validationErrors(graphqlError('This action is unauthorized.')), null)
  assert.equal(validationErrors(new Error('offline')), null)
})

test('what to tell the user: the validation messages, else the error, else a fallback', () => {
  assert.equal(errorMessage(validation({ 'input.name': ['Name is blank'], 'assets[0].file': ['File is invalid'] })), 'Name is blank File is invalid')
  assert.equal(errorMessage(graphqlError('This action is unauthorized.')), 'This action is unauthorized.')
  assert.equal(errorMessage(new Error('Failed to fetch')), 'Failed to fetch')
  assert.equal(errorMessage('boom', 'Try later.'), 'Try later.')
})

test('a validation message goes under its field, without the input. prefix', () => {
  const { form, errors } = fakeForm({ name: '', content: '' })
  setServerErrors(form, validation({ 'input.name': ["Name can't be blank", 'Name is too long'], 'input.content': ['Content is blank'] }))

  assert.deepEqual(errors, { name: "Name can't be blank Name is too long", content: 'Content is blank' })
})

test('a field can be named otherwise, and one the form does not have goes to the root', () => {
  const { form, errors } = fakeForm({ name: '', media: [] })
  setServerErrors(form, validation({ 'assets[1].file': ['File must be an image or a video'], post: ['Post must exist'] }), { fields: { assets: 'media' } })

  assert.deepEqual(errors, { media: 'File must be an image or a video', 'root.server': 'Post must exist' })
})

test('any other error goes to the root, whole', () => {
  const { form, errors } = fakeForm({ body: '' })
  setServerErrors(form, graphqlError('This action is unauthorized.'))
  assert.deepEqual(errors, { 'root.server': 'This action is unauthorized.' })

  const offline = fakeForm({ body: '' })
  setServerErrors(offline.form, new TypeError('Failed to fetch'), { fallback: 'Could not post.' })
  assert.deepEqual(offline.errors, { 'root.server': 'Failed to fetch' })

  const unknown = fakeForm({ body: '' })
  setServerErrors(unknown.form, 'boom', { fallback: 'Could not post.' })
  assert.deepEqual(unknown.errors, { 'root.server': 'Could not post.' })
})

test("Rails' messages come with the name of the field in front", () => {
  assert.deepEqual(railsErrors('Email', ['has already been taken', 'is invalid']), [{ message: 'Email has already been taken' }, { message: 'Email is invalid' }])
  assert.deepEqual(railsErrors('Password', 'is too short'), [{ message: 'Password is too short' }])
  assert.deepEqual(railsErrors('Name', undefined), [])
})
