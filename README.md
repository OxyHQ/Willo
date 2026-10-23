# Willo

Smart home control by Oxy. Connects to a Home Assistant instance and gives you a fast, native-feeling view over your climate and light entities.

Built with Expo (React Native).

## Development

```sh
bun install
bun start
```

`bun run lint` runs Biome (formatting and linting) plus the frontend's minimal Expo ESLint
config; `bun run format` formats with Biome.

## Oxy product identity

Willo's Oxy account calls use the shared linked transport for home management,
commands and camera snapshots. The session epoch resets the current home on
account changes; the product's `/homes` socket reads the current shared session
at each handshake and disconnects when that context changes. Home membership is
still checked by the backend. Home Assistant OAuth and device pairing remain
separate protocols.

Camera views fetch private images through that same transport, then render local
blob URLs on web or in-memory data URLs on native. They never pass Oxy bearers to
an image loader. Closing a view revokes its blob URL, and changing account aborts
or discards its previous snapshot. Responses are private and not HTTP-cacheable.

The backend's Oxy client and ecosystem activity use temporary workload identity,
including a registered local AWS SSO/assume-role identity. Own-product calls need
no customer API key, app scope or consent screen. The shared SDK resolves and
refreshes those credentials; deployment still controls the workload binding,
environment and recipient audience.
