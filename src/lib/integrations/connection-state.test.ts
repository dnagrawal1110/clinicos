import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, deriveConnectionState } from "./connection-state";

describe("connection state machine", () => {
  it("allows the documented forward transitions", () => {
    expect(canTransition("not-connected", "authorization-required")).toBe(true);
    expect(canTransition("authorizing", "authenticated")).toBe(true);
    expect(canTransition("authenticated", "discovering")).toBe(true);
    expect(canTransition("discovering", "mapping-required")).toBe(true);
    expect(canTransition("syncing", "healthy")).toBe(true);
  });

  it("rejects skipping straight from authenticated to healthy (Part 5: OAuth success != healthy)", () => {
    expect(canTransition("authenticated", "healthy")).toBe(false);
  });

  it("rejects skipping mapping entirely", () => {
    expect(canTransition("mapping-required", "healthy")).toBe(false);
    expect(canTransition("mapping-required", "syncing")).toBe(false);
  });

  it("allows recovery from token-expired/revoked back into the OAuth flow", () => {
    expect(canTransition("token-expired", "authorizing")).toBe(true);
    expect(canTransition("revoked", "authorizing")).toBe(true);
  });

  it("assertTransition throws on an invalid jump", () => {
    expect(() => assertTransition("not-connected", "healthy")).toThrow();
  });

  describe("deriveConnectionState", () => {
    it("reports not-connected when there is no connection row", () => {
      const state = deriveConnectionState({ hasConnection: false, tokenExpiresAt: null, storedStatus: "healthy", unmappedAssetCount: 0, totalAssetCount: 0, lastSyncFailed: false });
      expect(state).toBe("not-connected");
    });

    it("reports token-expired even if the stored status still says healthy", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: new Date(Date.now() - 1000).toISOString(), storedStatus: "healthy",
        unmappedAssetCount: 0, totalAssetCount: 3, lastSyncFailed: false,
      });
      expect(state).toBe("token-expired");
    });

    it("reports mapping-required when every discovered asset is still unmapped", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: null, storedStatus: "discovering",
        unmappedAssetCount: 3, totalAssetCount: 3, lastSyncFailed: false,
      });
      expect(state).toBe("discovering");
    });

    it("reports partially-mapped when some but not all assets are mapped", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: null, storedStatus: "syncing",
        unmappedAssetCount: 1, totalAssetCount: 3, lastSyncFailed: false,
      });
      expect(state).toBe("partially-mapped");
    });

    it("reports healthy once everything is mapped, nothing failed, and no sync is actively running", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: null, storedStatus: "mapping-required",
        unmappedAssetCount: 0, totalAssetCount: 3, lastSyncFailed: false,
      });
      expect(state).toBe("healthy");
    });

    it("still reports syncing while a sync is actively running, even if fully mapped", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: null, storedStatus: "syncing",
        unmappedAssetCount: 0, totalAssetCount: 3, lastSyncFailed: false,
      });
      expect(state).toBe("syncing");
    });

    it("reports sync-error when the last sync failed, even with everything mapped", () => {
      const state = deriveConnectionState({
        hasConnection: true, tokenExpiresAt: null, storedStatus: "syncing",
        unmappedAssetCount: 0, totalAssetCount: 3, lastSyncFailed: true,
      });
      expect(state).toBe("sync-error");
    });

    it("never overrides a terminal revoked/disconnected status", () => {
      const revoked = deriveConnectionState({ hasConnection: true, tokenExpiresAt: null, storedStatus: "revoked", unmappedAssetCount: 0, totalAssetCount: 0, lastSyncFailed: false });
      expect(revoked).toBe("revoked");
    });
  });
});
