import React from 'react';
import styled from '@emotion/native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from './storage';
import * as Linking from 'expo-linking';

const Container = styled.SafeAreaView``;
const Margin = styled.View`
  margin: 40px;
`;

const Label = styled.Text`
  margin-bottom: 10px;
`;

const TextInput = styled.TextInput`
  height: 40px;
  border-color: gray;
  border-width: 1px;
  padding: 5px;
  margin-bottom: 20px;
`;

const Submit = styled.Button``;

type LoginViewProps = {
  onAuthSucceeded: (result: { instanceUrl: string }) => void;
};

type LoginViewState = {
  instanceUrl: string;
};

export default class LoginView extends React.Component<LoginViewProps, LoginViewState> {
  state: LoginViewState = {
    instanceUrl: '',
  };

  handlePress = async () => {
    const { instanceUrl } = this.state;
    const redirectUrl = AuthSession.makeRedirectUri();
    // Home Assistant accepts any client_id whose scheme+host match the
    // redirect_uri (see homeassistant/components/auth/indieauth.py), so using
    // the redirect URI itself as the client_id needs no external hosting.
    const clientId = redirectUrl;
    const authUrl = `${instanceUrl}/auth/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
    })}`;
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type !== 'success') return;

    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code;
    if (typeof code !== 'string') return;

    await SecureStore.setItemAsync('authCode', code);
    await SecureStore.setItemAsync('instanceUrl', instanceUrl);
    await SecureStore.setItemAsync('clientId', clientId);
    this.props.onAuthSucceeded({ instanceUrl });
  };

  render() {
    return (
      <Container>
        <Margin>
          <Label>Home Assistant URL:</Label>
          <TextInput
            autoCapitalize="none"
            placeholder="https://localhost:8123"
            onChangeText={instanceUrl => this.setState({ instanceUrl })}
          />
          <Submit onPress={this.handlePress} title="Login" />
        </Margin>
      </Container>
    );
  }
}
