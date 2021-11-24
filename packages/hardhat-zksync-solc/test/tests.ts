import { assert } from "chai";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { ZkSyncArtifact } from "../src/types";

import { useEnvironment } from "./helpers";

describe("zksolc plugin", async function () {
  describe("Successful compilation", async function () {
    useEnvironment("successful-compilation");

    it("Should successfully compile the simple contract", async function () {
      await this.env.run(TASK_COMPILE);

      const artifact = this.env.artifacts.readArtifactSync(
        "Greeter"
      ) as ZkSyncArtifact;

      assert.equal(artifact.contractName, "Greeter");

      // Check that zkSync-specific artifact information was added.
      assert.deepEqual(
        artifact.factoryDeps,
        {},
        "Contract unexpectedly has dependencies"
      );
    });
  });

  // TODO: restore once compiler supports libraries.
  // describe("Multi-file", async function () {
  //   useEnvironment("multi-file");

  //   it("Should successfully compile the multi-file contracts", async function () {
  //     await this.env.run(TASK_COMPILE);
  //     assert.equal(
  //       this.env.artifacts.readArtifactSync("Foo").contractName,
  //       "Foo"
  //     );
  //     assert.equal(
  //       this.env.artifacts.readArtifactSync("Import").contractName,
  //       "Import"
  //     );
  //   });
  // });

  describe("Factory", async function () {
    useEnvironment("factory");

    it("Should successfully compile the factory contract", async function () {
      await this.env.run(TASK_COMPILE);

      const factoryArtifact = this.env.artifacts.readArtifactSync(
        "contracts/Factory.sol:Factory"
      ) as ZkSyncArtifact;
      const depArtifact = this.env.artifacts.readArtifactSync(
        "contracts/Factory.sol:Dep"
      ) as ZkSyncArtifact;

      assert.equal(factoryArtifact.contractName, "Factory");
      assert.equal(depArtifact.contractName, "Dep");

      // Check that zkSync-specific artifact information was added.

      // Factory contract should have one dependency.
      // We do not check for the actual value of the hash, as it depends on the bytecode yielded by the compiler and thus not static.
      // Instead we only check that it's a hash indeed.
      const depName = "Factory.sol:Dep";
      assert(
        depName in factoryArtifact.factoryDeps,
        "No required dependency in the artifact"
      );
      const depHash = factoryArtifact.factoryDeps[depName];
      const expectedLength = 32 * 2 + 2; // 32 bytes in hex + '0x'.
      assert(
        depHash.startsWith("0x") && depHash.length === expectedLength,
        "Contract hash is malformed"
      );

      // For the dependency contract should be no further dependencies.
      assert.deepEqual(
        depArtifact.factoryDeps,
        {},
        "Unexpected factory-deps for a dependency contract"
      );
    });
  });

  describe("NestedFacroty", async function () {
    useEnvironment("nested");

    it("Should successfully compile nested contracts", async function () {
      await this.env.run(TASK_COMPILE);

      const factoryArtifact = this.env.artifacts.readArtifactSync(
        "NestedFactory"
      ) as ZkSyncArtifact;
      const fooDepArtifact = this.env.artifacts.readArtifactSync(
        "contracts/deps/Foo.sol:FooDep"
      ) as ZkSyncArtifact;
      const barDepArtifact = this.env.artifacts.readArtifactSync(
        "contracts/deps/more_deps/Bar.sol:BarDep"
      ) as ZkSyncArtifact;

      // Check that zkSync-specific artifact information was added.

      // Factory contract should have one dependency.
      // We do not check for the actual value of the hash, as it depends on the bytecode yielded by the compiler and thus not static.
      // Instead we only check that it's a hash indeed.
      const fooDepName = "Bar.sol:BarDep";
      const barDepName = "Foo.sol:FooDep";
      for (const depName of [fooDepName, barDepName]) {
        assert(
          depName in factoryArtifact.factoryDeps,
          "No required dependency in the artifact"
        );
        const depHash = factoryArtifact.factoryDeps[depName];
        const expectedLength = 32 * 2 + 2; // 32 bytes in hex + '0x'.
        assert(
          depHash.startsWith("0x") && depHash.length === expectedLength,
          "Contract hash is malformed"
        );
      }

      // For the dependency contract should be no further dependencies.
      for (const depArtifact of [fooDepArtifact, barDepArtifact]) {
        assert.deepEqual(
          depArtifact.factoryDeps,
          {},
          "Unexpected factory-deps for a dependency contract"
        );
      }
    });
  });
});
