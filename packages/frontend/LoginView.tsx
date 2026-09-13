import React from 'react';
import styled from '@emotion/native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from './storage';
import * as Linking from 'expo-linking';

// Home Assistant's default install is reachable at this address out of the
// box (mDNS), so most people never need to type a URL at all.
const DEFAULT_INSTANCE_URL = 'http://homeassistant.local:8123';

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

const AdvancedToggle = styled.TouchableOpacity`
  margin-top: 20px;
  align-self: center;
`;

const AdvancedToggleLabel = styled.Text`
  color: gray;
  text-decoration-line: underline;
`;

type LoginViewProps = {
  onAuthSucceeded: (result: { instanceUrl: string }) => void;
};

type LoginViewState = {
  instanceUrl: string;
  showAdvanced: boolean;
};

export default class LoginView extends React.Component<LoginViewProps, LoginViewState> {
  state: LoginViewState = {
    instanceUrl: DEFAULT_INSTANCE_URL,
    showAdvanced: false,
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
    const { instanceUrl, showAdvanced } = this.state;

    return (
      <Container>
        <Margin>
          {showAdvanced && (
            <>
              <Label>Home Assistant URL:</Label>
              <TextInput
                autoCapitalize="none"
                value={instanceUrl}
                placeholder={DEFAULT_INSTANCE_URL}
                onChangeText={instanceUrl => this.setState({ instanceUrl })}
              />
            </>
          )}
          <Submit onPress={this.handlePress} title="Login" />
          <AdvancedToggle
            onPress={() => this.setState({ showAdvanced: !showAdvanced })}
          >
            <AdvancedToggleLabel>
              {showAdvanced ? 'Hide advanced' : 'Advanced'}
            </AdvancedToggleLabel>
          </AdvancedToggle>
        </Margin>
      </Container>
    );
  }
}
