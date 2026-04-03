type GraphQLType = {
  kind: string;
  name: string | null;
  description?: string | null;
  fields?: Array<{
    name: string;
    description?: string | null;
    args?: Array<{ name: string; description?: string | null; type?: unknown }>;
    type?: unknown;
    isDeprecated?: boolean;
  }> | null;
  inputFields?: Array<{
    name: string;
    description?: string | null;
    type?: unknown;
    defaultValue?: string | null;
  }> | null;
  enumValues?: Array<{
    name: string;
    description?: string | null;
  }> | null;
  possibleTypes?: Array<{ name: string }> | null;
};

type GraphQLSchema = {
  data?: {
    __schema: {
      queryType?: { name: string } | null;
      mutationType?: { name: string } | null;
      subscriptionType?: { name: string } | null;
      types: GraphQLType[];
    };
  };
};

type OpenAPISchema = {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Record<string, {
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
    parameters?: unknown[];
  }>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
};

export type SchemaSummary = {
  apiType: "graphql" | "openapi" | "unknown";
  queries?: string[];
  mutations?: string[];
  subscriptions?: string[];
  types?: string[];
  paths?: Array<{ method: string; path: string; summary?: string }>;
  totalEndpoints: number;
  totalTypes: number;
};

export type SearchResult = {
  kind: string;
  name: string;
  description?: string;
  parent?: string;
};

function isGraphQLSchema(schema: unknown): schema is GraphQLSchema {
  return !!schema && typeof schema === "object" && "data" in schema &&
    !!(schema as GraphQLSchema).data?.__schema;
}

function isOpenAPISchema(schema: unknown): schema is OpenAPISchema {
  return !!schema && typeof schema === "object" &&
    ("openapi" in schema || "swagger" in schema || "paths" in schema);
}

function getGraphQLFieldNames(types: GraphQLType[], rootTypeName: string | null | undefined): string[] {
  if (!rootTypeName) return [];
  const rootType = types.find((t) => t.name === rootTypeName);
  if (!rootType?.fields) return [];
  return rootType.fields.map((f) => f.name);
}

function getUserTypes(types: GraphQLType[]): string[] {
  return types
    .filter((t) => t.name && !t.name.startsWith("__") && t.kind !== "SCALAR")
    .map((t) => t.name!)
    .sort();
}

export function summarizeSchema(schema: unknown): SchemaSummary {
  if (isGraphQLSchema(schema)) {
    const s = schema.data!.__schema;
    const queries = getGraphQLFieldNames(s.types, s.queryType?.name);
    const mutations = getGraphQLFieldNames(s.types, s.mutationType?.name);
    const subscriptions = getGraphQLFieldNames(s.types, s.subscriptionType?.name);
    const types = getUserTypes(s.types);

    return {
      apiType: "graphql",
      queries,
      mutations,
      subscriptions,
      types,
      totalEndpoints: queries.length + mutations.length + subscriptions.length,
      totalTypes: types.length,
    };
  }

  if (isOpenAPISchema(schema)) {
    const paths: SchemaSummary["paths"] = [];
    if (schema.paths) {
      for (const [path, methods] of Object.entries(schema.paths)) {
        for (const [method, detail] of Object.entries(methods)) {
          if (["get", "post", "put", "patch", "delete"].includes(method)) {
            paths.push({
              method: method.toUpperCase(),
              path,
              summary: detail?.summary,
            });
          }
        }
      }
    }

    const schemaNames = schema.components?.schemas
      ? Object.keys(schema.components.schemas).sort()
      : [];

    return {
      apiType: "openapi",
      paths,
      types: schemaNames,
      totalEndpoints: paths.length,
      totalTypes: schemaNames.length,
    };
  }

  return { apiType: "unknown", totalEndpoints: 0, totalTypes: 0 };
}

export function searchSchema(schema: unknown, query: string, limit?: number): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  if (isGraphQLSchema(schema)) {
    const s = schema.data!.__schema;

    for (const type of s.types) {
      if (!type.name || type.name.startsWith("__")) continue;

      const nameMatch = type.name.toLowerCase().includes(q);
      const descMatch = type.description?.toLowerCase().includes(q);

      if (nameMatch || descMatch) {
        results.push({
          kind: type.kind,
          name: type.name,
          description: type.description ?? undefined,
        });
      }

      if (type.fields) {
        for (const field of type.fields) {
          const fNameMatch = field.name.toLowerCase().includes(q);
          const fDescMatch = field.description?.toLowerCase().includes(q);
          if (fNameMatch || fDescMatch) {
            results.push({
              kind: "FIELD",
              name: field.name,
              description: field.description ?? undefined,
              parent: type.name,
            });
          }
        }
      }

      if (type.inputFields) {
        for (const field of type.inputFields) {
          const fNameMatch = field.name.toLowerCase().includes(q);
          const fDescMatch = field.description?.toLowerCase().includes(q);
          if (fNameMatch || fDescMatch) {
            results.push({
              kind: "INPUT_FIELD",
              name: field.name,
              description: field.description ?? undefined,
              parent: type.name,
            });
          }
        }
      }

      if (type.enumValues) {
        for (const ev of type.enumValues) {
          if (ev.name.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q)) {
            results.push({
              kind: "ENUM_VALUE",
              name: ev.name,
              description: ev.description ?? undefined,
              parent: type.name,
            });
          }
        }
      }
    }
  }

  if (isOpenAPISchema(schema)) {
    if (schema.paths) {
      for (const [path, methods] of Object.entries(schema.paths)) {
        for (const [method, detail] of Object.entries(methods)) {
          if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
          const pathMatch = path.toLowerCase().includes(q);
          const summaryMatch = detail?.summary?.toLowerCase().includes(q);
          const descMatch = detail?.description?.toLowerCase().includes(q);
          const opIdMatch = detail?.operationId?.toLowerCase().includes(q);

          if (pathMatch || summaryMatch || descMatch || opIdMatch) {
            results.push({
              kind: `${method.toUpperCase()} endpoint`,
              name: `${method.toUpperCase()} ${path}`,
              description: detail?.summary ?? detail?.description ?? undefined,
            });
          }
        }
      }
    }

    if (schema.components?.schemas) {
      for (const [name] of Object.entries(schema.components.schemas)) {
        if (name.toLowerCase().includes(q)) {
          results.push({
            kind: "schema",
            name,
          });
        }
      }
    }
  }

  if (limit && results.length > limit) {
    return results.slice(0, limit);
  }
  return results;
}

export type FilterOptions = {
  filter?: string;
  summary?: boolean;
  typeName?: string;
  limit?: number;
};

export function filterSchema(schema: unknown, opts: FilterOptions): unknown {
  if (isGraphQLSchema(schema)) {
    return filterGraphQLSchema(schema, opts);
  }
  if (isOpenAPISchema(schema)) {
    return filterOpenAPISchema(schema, opts);
  }
  return schema;
}

function filterGraphQLSchema(schema: GraphQLSchema, opts: FilterOptions): unknown {
  const s = schema.data!.__schema;

  // Return specific type definition
  if (opts.typeName) {
    const type = s.types.find((t) => t.name === opts.typeName);
    if (!type) return { error: `Type "${opts.typeName}" not found` };
    return type;
  }

  // Filter by category
  if (opts.filter) {
    const f = opts.filter.toLowerCase();

    if (f === "mutations" || f === "mutation") {
      const names = getGraphQLFieldNames(s.types, s.mutationType?.name);
      if (opts.summary) return names.slice(0, opts.limit);
      const rootType = s.types.find((t) => t.name === s.mutationType?.name);
      const fields = rootType?.fields ?? [];
      return opts.limit ? fields.slice(0, opts.limit) : fields;
    }

    if (f === "queries" || f === "query") {
      const names = getGraphQLFieldNames(s.types, s.queryType?.name);
      if (opts.summary) return names.slice(0, opts.limit);
      const rootType = s.types.find((t) => t.name === s.queryType?.name);
      const fields = rootType?.fields ?? [];
      return opts.limit ? fields.slice(0, opts.limit) : fields;
    }

    if (f === "subscriptions" || f === "subscription") {
      const names = getGraphQLFieldNames(s.types, s.subscriptionType?.name);
      if (opts.summary) return names.slice(0, opts.limit);
      const rootType = s.types.find((t) => t.name === s.subscriptionType?.name);
      const fields = rootType?.fields ?? [];
      return opts.limit ? fields.slice(0, opts.limit) : fields;
    }

    if (f === "types") {
      const types = getUserTypes(s.types);
      if (opts.summary) return types.slice(0, opts.limit);
      const filtered = s.types
        .filter((t) => t.name && !t.name.startsWith("__") && t.kind !== "SCALAR");
      return opts.limit ? filtered.slice(0, opts.limit) : filtered;
    }

    // Treat as prefix match on type names
    const matching = s.types.filter(
      (t) => t.name && t.name.toLowerCase().startsWith(f),
    );
    if (opts.summary) {
      const names = matching.map((t) => t.name!);
      return opts.limit ? names.slice(0, opts.limit) : names;
    }
    return opts.limit ? matching.slice(0, opts.limit) : matching;
  }

  // Summary mode: names only
  if (opts.summary) {
    const summary = summarizeSchema(schema);
    return {
      queries: opts.limit ? summary.queries?.slice(0, opts.limit) : summary.queries,
      mutations: opts.limit ? summary.mutations?.slice(0, opts.limit) : summary.mutations,
      subscriptions: summary.subscriptions?.length ? summary.subscriptions : undefined,
      totalEndpoints: summary.totalEndpoints,
      totalTypes: summary.totalTypes,
    };
  }

  return schema;
}

function filterOpenAPISchema(schema: OpenAPISchema, opts: FilterOptions): unknown {
  // Filter by path prefix
  if (opts.filter) {
    const f = opts.filter.toLowerCase();
    const matchingPaths: Record<string, unknown> = {};
    let count = 0;

    if (schema.paths) {
      for (const [path, methods] of Object.entries(schema.paths)) {
        if (path.toLowerCase().includes(f)) {
          if (opts.limit && count >= opts.limit) break;
          if (opts.summary) {
            const ops: Record<string, string> = {};
            for (const [method, detail] of Object.entries(methods)) {
              if (["get", "post", "put", "patch", "delete"].includes(method)) {
                ops[method.toUpperCase()] = detail?.summary ?? "";
              }
            }
            matchingPaths[path] = ops;
          } else {
            matchingPaths[path] = methods;
          }
          count++;
        }
      }
    }
    return matchingPaths;
  }

  // Summary mode
  if (opts.summary) {
    const summary = summarizeSchema(schema);
    const paths = summary.paths ?? [];
    return {
      info: schema.info,
      paths: opts.limit ? paths.slice(0, opts.limit) : paths,
      totalEndpoints: summary.totalEndpoints,
      totalTypes: summary.totalTypes,
    };
  }

  return schema;
}
