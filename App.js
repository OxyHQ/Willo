import React from 'react';
import * as SecureStore from 'expo-secure-store';
import ThermostatView from './ThermostatView';
import connect from './connect';
import LoginView from './LoginView';
import EntitiesView from './EntitiesView';

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

  onAuthSucceeded = async ({ instanceUrl }) => {
    const authCode = await SecureStore.getItemAsync('authCode');
    const clientId = await SecureStore.getItemAsync('clientId');
    this.setTemperature = await connect({
      instanceUrl,
      authCode,
      clientId,
      getEntities: this.getEntities,
      getUpdatedState: this.getUpdatedState,
      getConfig: this.getConfig,
    });
  };

  async componentDidMount() {
    const authCode = await SecureStore.getItemAsync('authCode');
    const instanceUrl = await SecureStore.getItemAsync('instanceUrl');
    const clientId = await SecureStore.getItemAsync('clientId');
    if (!authCode || !instanceUrl || !clientId) {
      return this.setState({ unauthenticated: true });
    }
    this.setTemperature = await connect({
      authCode,
      instanceUrl,
      clientId,
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
