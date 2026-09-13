import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import Color from 'color';
import styled from '@emotion/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MotiView } from 'moti';
import type { Entity } from './types';

const BOX_SIZE = 160;
const ON_COLOR = '#FFC235';
const OFF_COLOR = '#3A3A3C';

const Container = styled.View`
  display: flex;
  align-items: center;
  padding: 10px 20px 40px 20px;
`;

const Title = styled.Text`
  color: #fefefe;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 24px;
`;

type ToggleBoxProps = {
  onPress?: () => void;
  isOn: boolean;
  color: string;
};

const ToggleBox = ({ onPress, isOn, color }: ToggleBoxProps) => (
  <TouchableWithoutFeedback onPress={onPress}>
    <MotiView
      animate={{ backgroundColor: isOn ? color : OFF_COLOR }}
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

const Status = styled.Text`
  color: #fefefe;
  font-size: 16px;
  margin-top: 20px;
`;

type LightSheetProps = {
  entity: Entity;
  onToggle: (turnOn: boolean) => void;
};

export default function LightSheet({ entity, onToggle }: LightSheetProps) {
  const isOn = entity.state === 'on';
  const color = Color(entity.attributes.rgb_color ?? ON_COLOR).string();

  return (
    <Container>
      <Title>{entity.attributes.friendly_name}</Title>
      <ToggleBox isOn={isOn} color={color} onPress={() => onToggle(!isOn)} />
      <Status>{isOn ? 'On' : 'Off'}</Status>
    </Container>
  );
}
