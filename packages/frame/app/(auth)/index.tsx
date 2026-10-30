import { View, useWindowDimensions } from 'react-native';
import { Text } from '@oxy.so/bloom/typography';
import { OxyDeviceSignIn } from '@oxy.so/services';
import { useTranslation } from 'react-i18next';

/**
 * A frame with no account yet: a big code to scan from across the room. The
 * phone that scans it opens Oxy's approval page, the person signs in there,
 * and this screen gives way to the frame on its own.
 */
export default function SignIn() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const short = Math.min(width, height);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.04 * short,
        padding: 0.06 * short,
      }}
    >
      <Text
        className="font-display"
        style={{ fontSize: 0.05 * short, fontWeight: '700', textAlign: 'center' }}
      >
        {t('signIn.title')}
      </Text>
      <OxyDeviceSignIn size={Math.round(0.45 * short)} />
      <Text
        className="font-display"
        style={{
          fontSize: 0.025 * short,
          opacity: 0.7,
          textAlign: 'center',
          maxWidth: 0.9 * short,
        }}
      >
        {t('signIn.caption')}
      </Text>
    </View>
  );
}
