import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import styled, { css } from '@emotion/native';

type ZoomProps = { zoom?: number };

export const Unit = styled.Text`
  position: relative;
  color: #fefefe;
  font-size: ${({ zoom = 1 }: ZoomProps) => String(18 * zoom)}px;
  top: ${({ zoom = 1 }: ZoomProps) => String(-3 * zoom)}px;
  font-weight: bold;
`;

const DegreeSymbol = styled.Text`
  position: relative;
  color: #fefefe;
  font-size: ${({ zoom = 1 }: ZoomProps) => String(16 * zoom)}px;
  font-weight: bold;
  margin-bottom: ${({ zoom = 1 }: ZoomProps) => String(3 * zoom)}px;
`;

export const Decimal = styled(Unit)`
  font-size: ${({ zoom = 1 }: ZoomProps) => String(15 * zoom)}px;
  margin-top: ${({ zoom = 1 }: ZoomProps) => String(-4 * zoom)}px;
  top: ${({ zoom = 1 }: ZoomProps) => String(-4 * zoom)}px;
`;

export const Value = styled.Text`
  color: #fefefe;
  font-size: ${({ zoom = 1 }: ZoomProps) => String(30 * zoom)}px;
  font-weight: bold;
`;

export const LabelBox = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const Label = styled.Text`
  color: #fefefe;
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 10px;
`;

type PercentageProps = { style?: StyleProp<ViewStyle>; children: ReactNode };

export const Percentage = styled((props: PercentageProps) => (
  <View style={props.style}>
    <Value>{props.children}</Value>
    <Unit>%</Unit>
  </View>
))`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
`;

type DegreeProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  zoom?: number;
};

export const Degree = styled((props: DegreeProps) => (
  <View style={props.style}>
    <Value zoom={props.zoom}>{String(props.children).split('.')[0]}</Value>
    <View
      style={css`
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      `}
    >
      <DegreeSymbol zoom={props.zoom}>⚬</DegreeSymbol>
      <Decimal zoom={props.zoom}>
        .{String(props.children).split('.')[1] || 0}
      </Decimal>
    </View>
  </View>
))`
  display: flex;
  flex-direction: row;
  align-items: stretch;
`;
