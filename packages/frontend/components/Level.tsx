import React, { ReactNode } from 'react';
import { PanResponder, PanResponderGestureState, View, ViewProps } from 'react-native';
import { MotiView } from 'moti';
import styled from '@emotion/native';
import { getPrimaryColor } from '../colors';
import { BOX_SIZE, EXPANDED_BOX_SIZE, LARGE_BOX_SIZE } from '../constants';
import type { Pose } from '../types';

const getPercentage = (temp: number) => ((temp - 5) / (25 - 5)) * 100;

const config: Record<string, { height: number }> = {
  collapsed: { height: 0 },
  confirming: { height: LARGE_BOX_SIZE / 2 },
};
Array.from({ length: 25 }).forEach(
  (_, t) =>
    (config[`${t + 5}`] = {
      height: EXPANDED_BOX_SIZE * ((getPercentage(t + 5) + 1) / 100),
    })
);

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
  background-color: ${(props: { temp: number }) => getPrimaryColor(props.temp)};
`;

type LevelTrackProps = ViewProps & {
  innRef?: React.Ref<View>;
  pose: Pose;
  temp: number;
  children?: ReactNode;
};

const LevelTrack = styled((props: LevelTrackProps) => {
  return (
    <View ref={props.innRef} {...props}>
      <Value
        pointerEvents="none"
        animate={
          config[props.pose === 'expanded' ? String(props.temp) : props.pose] ?? {
            height: 0,
          }
        }
      >
        <Handle
          animate={{ scale: props.pose === 'expanded' ? 1 : 0 }}
          temp={props.temp}
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
  temp: number;
  setTemperature: (value: number | 'off') => void;
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
    const offset = this.state.height - evt.nativeEvent.locationY;
    const temp = Math.round(
      Math.min(Math.max(offset / (this.state.height / 21), 0), 21) + 4
    );
    this.props.setTemperature(temp === 4 ? 'off' : temp);
  };

  render() {
    return (
      <LevelTrack
        {...this.props}
        {...this.panResponder.panHandlers}
        pointerEvents={this.props.pose !== 'collapsed' ? 'auto' : 'none'}
        onLayout={evt => this.setState({ height: evt.nativeEvent.layout.height })}
      />
    );
  }
}
