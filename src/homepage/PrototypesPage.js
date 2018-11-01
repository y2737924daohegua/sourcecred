// @flow

import stringify from "json-stable-stringify";
import React, {type ComponentType} from "react";

import type {RepoIdRegistry} from "../explorer/repoIdRegistry";
import Link from "../webutil/Link";
import type {Assets} from "../webutil/assets";

export default function makePrototypesPage(
  registry: RepoIdRegistry
): ComponentType<{|+assets: Assets|}> {
  return class PrototypesPage extends React.Component<{|+assets: Assets|}> {
    render() {
      return (
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            marginBottom: 200,
            padding: "0 10px",
            lineHeight: 1.5,
          }}
        >
          <p>Select a project:</p>
          <ul>
            {registry.map((x) => (
              <li key={stringify(x)}>
                <Link to={`/prototypes/${x.owner}/${x.name}/`}>
                  {`${x.owner}/${x.name}`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  };
}