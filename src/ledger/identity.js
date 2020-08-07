// @flow

/**
 * This module has a core data type identifying SourceCred identities.
 *
 * The scope for this data type is to model:
 * - a unique identifier for each identity
 * - a unique (renameable) identityName they choose
 * - the address of every node they correspond to in the graph
 *
 * Unlike most other state in SourceCred, the Identity state is
 * nondeterministically generated by SourceCred itself, and then persisted
 * long-term within the instance.
 *
 * This is in contrast to Graph data, which usually comes from an external
 * source, and is not persisted long-term, but instead is re-generated when
 * needed.
 *
 * In particular, this kernel of identity data is stored within the core ledger,
 * since it's necessary to track consistently when tracking Grain distribution.
 * This type should not grow to include all the data that the UI will
 * eventually want to show; that should be kept in a different data store which
 * isn't being used as a transaction ledger.
 *
 */
import {
  type Uuid,
  parser as uuidParser,
  random as randomUuid,
} from "../util/uuid";
import * as C from "../util/combo";
import {
  type NodeAddressT,
  NodeAddress,
  type Node as GraphNode,
  type NodeContraction,
  EdgeAddress,
} from "../core/graph";
import type {NodeType} from "../analysis/types";
import type {PluginDeclaration} from "../analysis/pluginDeclaration";

/**
 * We validate identityNames using GitHub-esque rules.
 *
 * IdentityNames are always lower-case.
 */
export opaque type IdentityName: string = string;
const IDENTITY_NAME_PATTERN = /^[A-Za-z0-9-]+$/;

export type IdentitySubtype = "USER" | "PROJECT" | "ORGANIZATION" | "BOT";
export type IdentityId = Uuid;
export type Identity = {|
  // UUID, assigned when the identity is created.
  +id: IdentityId,
  +name: IdentityName,
  +subtype: IdentitySubtype,
  // The identity's own node address.
  +address: NodeAddressT,
  // Every other node in the graph that this identity corresponds to.
  // Does not include the identity's "own" address, i.e. the result
  // of calling (identityAddress(identity.id)).
  +aliases: $ReadOnlyArray<Alias>,
|};

/**
 * An Alias is basically another graph Node which resolves to this identity. We
 * ignore the timestamp because it's generally not significant for users; we
 * keep the address out of obvious necessity, and we keep the description so we
 * can describe this alias in UIs (e.g. the ledger admin panel).
 */
export type Alias = {|
  +description: string,
  +address: NodeAddressT,
|};

export function newIdentity(subtype: IdentitySubtype, name: string): Identity {
  const id = randomUuid();
  try {
    identitySubtypeParser.parseOrThrow(subtype);
  } catch (e) {
    throw new Error(`invalid identity subtype: ${subtype}`);
  }
  return {
    id,
    subtype,
    address: NodeAddress.append(IDENTITY_PREFIX, subtype, id),
    name: identityNameFromString(name),
    aliases: [],
  };
}

// It's not in the typical [owner, name] format because it isn't provided by a plugin.
// Instead, it's a raw type owned by SourceCred project.
export const IDENTITY_PREFIX = NodeAddress.fromParts([
  "sourcecred",
  "core",
  "IDENTITY",
]);

/**
 * Parse a IdentityName from a string.
 *
 * Throws an error if the identityName is invalid.
 */
export function identityNameFromString(identityName: string): IdentityName {
  if (!identityName.match(IDENTITY_NAME_PATTERN)) {
    throw new Error(`invalid identityName: ${identityName}`);
  }
  return identityName.toLowerCase();
}

export function graphNode({name, address}: Identity): GraphNode {
  return {
    address,
    description: name,
    timestampMs: null,
  };
}

export function contractions(
  identities: $ReadOnlyArray<Identity>
): $ReadOnlyArray<NodeContraction> {
  return identities.map((i) => ({
    replacement: graphNode(i),
    old: i.aliases.map((a) => a.address),
  }));
}

export const identityNameParser: C.Parser<IdentityName> = C.fmap(
  C.string,
  identityNameFromString
);

export const identitySubtypeParser: C.Parser<IdentitySubtype> = C.exactly([
  "USER",
  "BOT",
  "ORGANIZATION",
  "PROJECT",
]);

export const aliasParser: C.Parser<Alias> = C.object({
  address: NodeAddress.parser,
  description: C.string,
});

export const identityParser: C.Parser<Identity> = C.object({
  id: uuidParser,
  subtype: identitySubtypeParser,
  name: identityNameParser,
  address: NodeAddress.parser,
  aliases: C.array(aliasParser),
});

const userNodeType: NodeType = {
  name: "user",
  pluralName: "users",
  defaultWeight: 0,
  description: "a canonical user identity",
  prefix: NodeAddress.append(IDENTITY_PREFIX, "USER"),
};
const projectNodeType: NodeType = {
  name: "project",
  pluralName: "projects",
  defaultWeight: 0,
  description: "a canonical project identity",
  prefix: NodeAddress.append(IDENTITY_PREFIX, "PROJECT"),
};
const organizationNodeType: NodeType = {
  name: "organization",
  pluralName: "organizations",
  defaultWeight: 0,
  description: "a canonical organization identity",
  prefix: NodeAddress.append(IDENTITY_PREFIX, "ORGANIZATION"),
};
const botNodeType: NodeType = {
  name: "bot",
  pluralName: "bots",
  defaultWeight: 0,
  description: "a canonical bot identity",
  prefix: NodeAddress.append(IDENTITY_PREFIX, "BOT"),
};
const nodeTypes = [
  userNodeType,
  projectNodeType,
  organizationNodeType,
  botNodeType,
];

export const declaration: PluginDeclaration = {
  name: "Identity",
  nodePrefix: IDENTITY_PREFIX,
  edgePrefix: EdgeAddress.fromParts(["sourcecred", "core", "IDENTITY"]),
  nodeTypes,
  userTypes: nodeTypes,
  edgeTypes: [],
};