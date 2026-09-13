import React from 'react';
import * as SecureStore from './storage';
import * as WebBrowser from 'expo-web-browser';
import ThermostatView from './ThermostatView';
import connect from './connect';
import LoginView from './LoginView';
import EntitiesView from './EntitiesView';

// Required by expo-auth-session: on web, this lets the popup opened for
// login detect that it's the redirect target, hand the result back to the
// window that opened it, and close itself.
WebBrowser.maybeCompleteAuthSession();

export const Context = React.createContext({ entities: [] });

export default class App extends React.Component {
  state = {
    entities: [],
    unauthenticated: null,
    locationName: 'My home',
  };

  getEntities = entities => this.setState({ entities });
  getUpdatedState = entity =>
    this.setState(({ entities }) => {
      const updated = entities.map(e =>
        e.entity_id !== entity.entity_id ? e : entity
      );

      return { entities: updated };
    });
  getConfig = config =>
    this.setState({
      locationName: config.location_name,
    });

  onRefreshToken = refreshToken => {
    SecureStore.setItemAsync('refreshToken', refreshToken);
    SecureStore.deleteItemAsync('authCode');
  };

  onAuthSucceeded = async ({ instanceUrl }) => {
    const authCode = await SecureStore.getItemAsync('authCode');
    const clientId = await SecureStore.getItemAsync('clientId');
    this.setTemperature = await connect({
      instanceUrl,
      authCode,
      clientId,
      onRefreshToken: this.onRefreshToken,
      getEntities: this.getEntities,
      getUpdatedState: this.getUpdatedState,
      getConfig: this.getConfig,
    });
  };

  async componentDidMount() {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const instanceUrl = await SecureStore.getItemAsync('instanceUrl');
    const clientId = await SecureStore.getItemAsync('clientId');
    if (!refreshToken || !instanceUrl || !clientId) {
      return this.setState({ unauthenticated: true });
    }
    this.setTemperature = await connect({
      refreshToken,
      instanceUrl,
      clientId,
      onRefreshToken: this.onRefreshToken,
      getEntities: this.getEntities,
      getUpdatedState: this.getUpdatedState,
      getConfig: this.getConfig,
    });
  }

  render() {
    return (
      <Context.Provider value={this.state}>
        {this.state.unauthenticated === true || !this.state.entities.length ? (
          <LoginView onAuthSucceeded={this.onAuthSucceeded} />
        ) : (
          <EntitiesView
            locationName={this.state.locationName}
            entities={this.state.entities}
            setTemperature={this.setTemperature}
          />
        )}
      </Context.Provider>
    );
  }
}
