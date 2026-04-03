import type { BackendClient } from "@pipedream/sdk";
import type { GraphQLSource } from "../../types.js";

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        ...FullType
      }
    }
  }

  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args {
        ...InputValue
      }
      type {
        ...TypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...InputValue
    }
    interfaces {
      ...TypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      deprecationReason
    }
    possibleTypes {
      ...TypeRef
    }
  }

  fragment InputValue on __InputValue {
    name
    description
    type {
      ...TypeRef
    }
    defaultValue
  }

  fragment TypeRef on __Type {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
`;

export type GraphQLFetchOptions = {
  source: GraphQLSource;
  client?: BackendClient;
  externalUserId?: string;
  accountId?: string;
};

export async function fetchGraphQLSchema(opts: GraphQLFetchOptions): Promise<unknown> {
  const { source, client, externalUserId, accountId } = opts;

  // If we have a client and account, route through pdc proxy for OAuth auth
  if (client && externalUserId && accountId) {
    const resp = await client.makeProxyRequest(
      {
        searchParams: {
          external_user_id: externalUserId,
          account_id: accountId,
        },
      },
      {
        url: source.endpoint,
        options: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(source.headers ?? {}),
          },
          body: JSON.stringify({ query: INTROSPECTION_QUERY }),
        },
      },
    );
    return resp;
  }

  // Direct fetch for public schemas
  const resp = await fetch(source.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(source.headers ?? {}),
    },
    body: JSON.stringify({ query: INTROSPECTION_QUERY }),
  });

  if (!resp.ok) {
    throw new Error(`GraphQL introspection failed: ${resp.status} ${resp.statusText}`);
  }

  return resp.json();
}
