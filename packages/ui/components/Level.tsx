import React, { ReactNode } from 'react';
import { PanResponder, PanResponderGestureState, View, ViewProps } from 'react-native';
import { MotiView } from 'moti';
import styled from '@emotion/native';
import { EXPANDED_BOX_SIZE, LARGE_BOX_SIZE } from '../constants';

export type Pose = 'collapsed' | 'confirming' | 'expanded';

type LevelRange = { min: number; max: number };

const getPercentage = (value: number, { min, max }: LevelRange) =>
  ((value - min) / (max - min)) * 100;

const buildConfig = (range: LevelRange): Record<string, { height: number }> => {
  const config: Record<string, { height: number }> = {
    collapsed: { height: 0 },
    confirming: { height: LARGE_BOX_SIZE / 2 },
  };
  for (let value = range.min; value <= range.max; value++) {
    config[`${value}`] = {
      height: EXPANDED_BOX_SIZE * ((getPercentage(value, range) + 1) / 100),
    };
  }
  return config;
};

const ActionWrapper = styled.View`
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${String(LARGE_BOX_SIZE / 2)}px;
`;

const Value = styled(MotiView)`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 0 0 50px 50px;
  background-color: #ffffff;
`;

const Handle = styled(MotiView)`
  height: 6px;
  width: 24%;
  border-radius: 10px;
  margin-top: 10px;
  background-color: ${(props: { color: string }) => props.color};
`;

type LevelTrackProps = ViewProps & {
  innRef?: React.Ref<View>;
  pose: Pose;
  value: number;
  color: string;
  config: Record<string, { height: number }>;
  children?: ReactNode;
};

const LevelTrack = styled((props: LevelTrackProps) => {
  return (
    <View ref={props.innRef} {...props}>
      <Value
        pointerEvents="none"
        animate={
          props.config[props.pose === 'expanded' ? String(props.value) : props.pose] ?? {
            height: 0,
          }
        }
      >
        <Handle
          animate={{ scale: props.pose === 'expanded' ? 1 : 0 }}
          color={props.color}
        />
      </Value>
      <ActionWrapper pointerEvents={props.pose === 'expanded' ? 'none' : 'auto'}>
        {props.children}
      </ActionWrapper>
    </View>
  );
})`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50px;
  overflow: hidden;
`;

type LevelProps = {
  pose: Pose;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (value: number | 'off') => void;
  children?: ReactNode;
};

type LevelState = {
  height: number;
};

export default class Level extends React.Component<LevelProps, LevelState> {
  panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => this.onPanResponderMove(evt, gestureState),
  });

  state: LevelState = {
    height: EXPANDED_BOX_SIZE,
  };

  onPanResponderMove = (
    evt: { nativeEvent: { locationY: number } },
    gestureState: PanResponderGestureState
  ) => {
    const { min, max } = this.props;
    const steps = max - min + 1;
    const offset = this.state.height - evt.nativeEvent.locationY;
    const value = Math.round(
      Math.min(Math.max(offset / (this.state.height / steps), 0), steps) + (min - 1)
    );
    this.props.onChange(value === min - 1 ? 'off' : value);
  };

  render() {
    const { pose, value, min, max, color, children } = this.props;
    return (
      <LevelTrack
        pose={pose}
        value={value}
        color={color}
        config={buildConfig({ min, max })}
        {...this.panResponder.panHandlers}
        pointerEvents={pose !== 'collapsed' ? 'auto' : 'none'}
        onLayout={evt => this.setState({ height: evt.nativeEvent.layout.height })}
      >
        {children}
      </LevelTrack>
    );
  }
}
