// apollo-upload-client ships JSDoc, not declarations.
declare module 'apollo-upload-client/UploadHttpLink.mjs' {
  import { ApolloLink, type HttpLink } from '@apollo/client'

  export default class UploadHttpLink extends ApolloLink {
    constructor(options?: HttpLink.Options)
  }
}
