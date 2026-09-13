import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Color from 'color';
import styled, { css } from '@emotion/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MotiView } from 'moti';
import { LabelBox, CaptionLabel as Label, Percentage } from '@willo/ui';
import type { Entity } from '../types';

const BOX_SIZE = 160;
const ON_COLOR = '#FFC235';
const OFF_GRADIENT: [string, string] = ['#57575A', '#2C2C2E'];

const Container = styled(LinearGradient)`
  display: flex;
  align-items: stretch;
  border-radius: 24px;
  overflow: hidden;
`;

const Header = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px 0 20px;
`;

const Title = styled.Text`
  color: #fefefe;
  font-size: 18px;
`;

const Center = styled.View`
  display: flex;
  align-items: center;
  padding: 30px 20px;
`;

type ToggleBoxProps = {
  onPress?: () => void;
  isOn: boolean;
  color: string;
};

const ToggleBox = ({ onPress, isOn, color }: ToggleBoxProps) => (
  <TouchableWithoutFeedback onPress={onPress}>
    <MotiView
      animate={{ backgroundColor: isOn ? color : '#3A3A3C' }}
      style={{
        width: BOX_SIZE,
        height: BOX_SIZE,
        borderRadius: BOX_SIZE / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Icon name={isOn ? 'lightbulb-on' : 'lightbulb-off-outline'} size={64} color="#fefefe" />
    </MotiView>
  </TouchableWithoutFeedback>
);

const Footer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 10px 20px 30px 20px;
`;

type LightSheetProps = {
  entity: Entity;
  onClose: () => void;
  onToggle: (turnOn: boolean) => void;
};

export default function LightSheet({ entity, onClose, onToggle }: LightSheetProps) {
  const isOn = entity.state === 'on';
  const primaryColor = Color(entity.attributes.rgb_color ?? ON_COLOR).string();
  const gradient: [string, string] = isOn
    ? [Color(primaryColor).lighten(0.1).string(), Color(primaryColor).darken(0.3).string()]
    : OFF_GRADIENT;
  const brightness = entity.attributes.brightness;

  return (
    <Container colors={gradient}>
      <Header>
        <Icon
          name="close-circle"
          onPress={onClose}
          size={26}
          style={css`
            color: #fff;
          `}
        />
        <Title>{entity.attributes.friendly_name}</Title>
        <Icon
          name="lightbulb-outline"
          size={26}
          style={css`
            color: #fff;
          `}
        />
      </Header>

      <Center>
        <ToggleBox isOn={isOn} color={primaryColor} onPress={() => onToggle(!isOn)} />
      </Center>

      <Footer>
        <LabelBox>
          <Label>Status</Label>
          <Title>{isOn ? 'On' : 'Off'}</Title>
        </LabelBox>
        {brightness != null && (
          <LabelBox>
            <Label>Brightness</Label>
            <Percentage>{Math.round((brightness / 255) * 100)}</Percentage>
          </LabelBox>
        )}
      </Footer>
    </Container>
  );
}
