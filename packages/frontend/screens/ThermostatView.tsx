import React, { ComponentProps, ReactNode } from 'react';
import {
  Text,
  View,
  StatusBar,
  StyleProp,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import styled, { css } from '@emotion/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MotiView, MotiText, AnimatePresence, motify } from 'moti';
import { Easing } from 'react-native-reanimated';
import {
  getGradient,
  getPrimaryColor,
  getSecondaryColor,
  Degree,
  Percentage,
  LabelBox,
  CaptionLabel as Label,
  Level,
  EXPANDED_BOX_SIZE,
  BOX_SIZE,
  LARGE_BOX_SIZE,
  type Pose,
} from '@willo.sh/ui';
import type { Entity } from '../types';

const Container = styled(LinearGradient)`
  flex: 1;
  display: flex;
`;

const Safe = styled.SafeAreaView`
  display: flex;
  flex: 1;
  align-items: stretch;
`;

const BOX_POSES: Record<Pose, { height: number; top: number }> = {
  collapsed: { height: BOX_SIZE, top: 0 },
  expanded: { height: EXPANDED_BOX_SIZE, top: 20 },
  confirming: { height: LARGE_BOX_SIZE, top: 0 },
};

type BoxProps = {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  pose: Pose;
  children?: ReactNode;
};

const Box = styled(({ style, onPress, pose, children }: BoxProps) => (
  <TouchableWithoutFeedback onPress={onPress}>
    <MotiView style={style} animate={BOX_POSES[pose]}>
      {children}
    </MotiView>
  </TouchableWithoutFeedback>
))`
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: center;
  background-color: #ffc235;
  width: ${String(BOX_SIZE)}px;
  border-radius: 50px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  padding: 20px;
`;

const boxLabel = (temp: number, current: number, open: boolean) => {
  const t = Math.round(temp);
  const c = Math.round(current);
  const text = c >= t ? 'Set to' : 'Heating to';

  return (
    <MotiText
      animate={{ opacity: open ? 0 : 1 }}
      style={css`
        color: #fefefe;
        margin-bottom: auto;
      `}
    >
      {text}
    </MotiText>
  );
};

const TEMP_POSES: Record<Pose, { top: number; fontSize: number }> = {
  collapsed: { top: 0, fontSize: 90 },
  expanded: { top: -350, fontSize: 70 },
  confirming: { top: -80, fontSize: 90 },
};

const Temp = styled(MotiText)`
  color: #fefefe;
  margin-right: -35px;
  margin-bottom: auto;
`;

const Header = styled(MotiView)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  margin-bottom: 80px;
`;

const Title = styled.Text`
  color: #fefefe;
  font-size: 18px;
`;

const Footer = styled(MotiView)`
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: auto;
`;

type IconName = ComponentProps<typeof Icon>['name'];

const ICONS: Record<string, IconName> = {
  manual: 'cursor-pointer',
  'smart schedule': 'calendar-star',
  off: 'power',
  timer: 'timer',
};

type OperationModeProps = {
  style?: StyleProp<ViewStyle>;
  children: string;
};

const OperationMode = styled(({ style, children }: OperationModeProps) => (
  <View style={style}>
    <Icon
      style={css`
        color: #fefefe;
        margin-right: 10px;
      `}
      size={24}
      name={ICONS[children.toLowerCase()] ?? 'thermostat'}
    />
    <Text
      style={css`
        color: #fefefe;
      `}
    >
      {children}
    </Text>
  </View>
))`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: center;
  border: 1px solid #fff;
  border-radius: 40px;
  padding: 2px 15px 2px 10px;
  margin-top: 50px;
`;

type TimerLogicProps = ViewProps & {
  onPoseCompleted?: () => void;
};

class TimerLogic extends React.Component<TimerLogicProps> {
  timeoutId: ReturnType<typeof setTimeout> | undefined;

  componentDidMount() {
    this.timeoutId = setTimeout(() => this.props.onPoseCompleted?.(), 5000);
  }
  componentWillUnmount() {
    clearTimeout(this.timeoutId);
  }
  render() {
    return <View {...this.props} />;
  }
}

const MotiTimerLogic = motify(TimerLogic)();

const Timer = styled(MotiTimerLogic)`
  position: absolute;
  top: 0;
  left: 0;
  height: 4px;
  background-color: ${(props: { temp: number }) => getSecondaryColor(props.temp)};
`;

const MotiCancelButton = motify(TouchableOpacity)();

type CancelProps = {
  onPress?: () => void;
  children?: ReactNode;
};

const Cancel = styled((props: CancelProps) => (
  <MotiCancelButton
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    exitTransition={{ type: 'timing', duration: 100 }}
    {...props}
  >
    <Text
      style={css`
        color: #000;
      `}
    >
      {props.children}
    </Text>
  </MotiCancelButton>
))`
  z-index: 1;
  margin-top: auto;
  margin-bottom: 30px;
  border: 1px solid #000;
  border-radius: 40px;
  padding: 4px 14px;
`;

const DEBUG_TEMP_SHIFT = 0;

type ThermostatViewProps = {
  entity?: Entity | null;
  onClose: () => void;
  setTemperature: (temp: number) => void;
};

type ThermostatViewState = {
  open: boolean;
  tempUserOverride: number | null;
  timeout: boolean;
};

export default class ThermostatView extends React.Component<
  ThermostatViewProps,
  ThermostatViewState
> {
  state: ThermostatViewState = {
    open: false,
    tempUserOverride: null,
    timeout: false,
  };

  static getDerivedStateFromProps(
    props: ThermostatViewProps,
    state: ThermostatViewState
  ): ThermostatViewState | null {
    if (props.entity?.attributes.temperature === state.tempUserOverride) {
      return { ...state, tempUserOverride: null };
    }
    return null;
  }

  render() {
    const { state } = this;
    const { entity, onClose, setTemperature } = this.props;

    if (!entity) {
      return (
        <Container colors={getGradient(0 + DEBUG_TEMP_SHIFT)}>
          <StatusBar barStyle="light-content" />
          <Safe>
            <Text>Loading...</Text>
          </Safe>
        </Container>
      );
    }

    const attrs = entity.attributes;
    const temp = state.tempUserOverride ?? (attrs.temperature ?? 0) + DEBUG_TEMP_SHIFT;
    const currentTemperature = attrs.current_temperature ?? 0;

    const pose: Pose = state.open ? 'expanded' : state.timeout ? 'confirming' : 'collapsed';

    return (
      <TouchableWithoutFeedback onPress={() => this.setState({ open: false })}>
        <Container colors={getGradient(temp)}>
          <StatusBar barStyle="light-content" />
          <Safe>
            <Header animate={{ top: state.open ? -100 : 0 }}>
              <Icon
                name="close-circle"
                onPress={onClose}
                size={30}
                style={css`
                  color: #fff;
                `}
              />
              <Title>{attrs.friendly_name}</Title>
              <Icon
                name="cog"
                size={30}
                style={css`
                  color: #fff;
                `}
              />
            </Header>
            <Box
              style={{
                backgroundColor: getPrimaryColor(temp),
              }}
              pose={pose}
              onPress={() => pose === 'collapsed' && this.setState({ open: true })}
            >
              {boxLabel(temp, currentTemperature, state.open)}
              <Temp animate={TEMP_POSES[pose]}>{temp}°</Temp>
              <Level
                value={temp}
                min={5}
                max={25}
                color={getPrimaryColor(temp)}
                pose={pose}
                onChange={value => {
                  // Dragging past the minimum reports 'off'; there's no
                  // dedicated "off" handling downstream (HA's
                  // set_temperature service takes a number), so treat it
                  // as the coldest setting rather than passing the string
                  // through.
                  this.setState({
                    tempUserOverride: value === 'off' ? 0 : value,
                    timeout: true,
                  });
                }}
              >
                <AnimatePresence>
                  {pose === 'confirming' && (
                    <Timer
                      from={{ width: 0 }}
                      animate={{ width: BOX_SIZE }}
                      exit={{ width: 0 }}
                      transition={{
                        type: 'timing',
                        duration: 5000,
                        easing: Easing.linear,
                      }}
                      onPoseCompleted={() => {
                        this.setState({ timeout: false });
                        setTemperature(temp);
                      }}
                      key="timer"
                      temp={temp}
                    />
                  )}
                  {pose === 'confirming' && (
                    <Cancel
                      key="cancel"
                      onPress={() =>
                        this.setState({
                          open: false,
                          timeout: false,
                          tempUserOverride: attrs.temperature ?? null,
                        })
                      }
                    >
                      Cancel
                    </Cancel>
                  )}
                </AnimatePresence>
              </Level>
            </Box>

            <Footer animate={{ bottom: state.open ? -300 : 0 }}>
              <OperationMode>{attrs.operation_mode ?? ''}</OperationMode>
              <View
                style={css`
                  display: flex;
                  flex-direction: row;
                  justify-content: space-between;
                  padding: 80px;
                  margin-top: auto;
                `}
              >
                <LabelBox>
                  <Label>Inside now</Label>
                  <Degree>{currentTemperature}</Degree>
                </LabelBox>
                <LabelBox>
                  <Label>Humidity</Label>
                  <Percentage>{Math.round(attrs.current_humidity ?? 0)}</Percentage>
                </LabelBox>
              </View>
            </Footer>
          </Safe>
        </Container>
      </TouchableWithoutFeedback>
    );
  }
}
