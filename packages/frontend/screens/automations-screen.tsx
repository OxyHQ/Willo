import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, type IconName } from '@willo/ui';
import { AddButton, Label, SectionTitle } from '@willo/ui';
import { RoutineRow } from '../components/routine-row';
import { CardStrip, PageColumns, PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors } from '@willo/ui';
const upcoming: { id: string; time: string; period: string; name: string; icon: IconName }[] = [
  { id: 'kettle', time: '10:00', period: 'AM', name: 'Morning kettle', icon: 'kettle' },
  { id: 'security', time: '7:30', period: 'PM', name: 'Nighttime security', icon: 'lock' },
  { id: 'jam', time: '8:00', period: 'PM', name: 'Friday jam', icon: 'speaker' },
];
export function AutomationsScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, notify } = useHome();
  const { compact, split } = useResponsiveLayout();
  const shown = upcoming.filter(item => !state.dismissedUpcoming.includes(item.id));
  return <View className="min-h-0 flex-1 bg-white">
    <PageScroll>{header}<PageColumns weights={[1, 1.35]}>
      <View><SectionTitle>Upcoming</SectionTitle><CardStrip gap={12}>
        {shown.length ? shown.map((item, index) => <View key={item.id}
          className={`min-h-[173px] justify-between rounded-[27px] p-4 ${index === 0 ? 'bg-home-sky' : 'bg-home-surface'}`}
          style={{ width: compact ? 156 : split ? '100%' : 196, gap: 32 }}>
          <View className="flex-row items-center justify-between"><Icon name={item.icon} size={23} color={index === 0 ? colors.onSky : colors.ink}/>
            <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${item.name}`} onPress={() => dispatch({ type: 'DISMISS_UPCOMING', id: item.id })}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/80"><Icon name="close" size={16}/></Pressable>
          </View>
          <View><Label className={`text-[33px] leading-[41px] ${index === 0 ? 'text-home-on-sky' : ''}`}>{item.time}<Label className={`text-[12px] ${index === 0 ? 'text-home-on-sky' : ''}`}> {item.period}</Label></Label>
            <Label className={`mt-1 text-[11px] leading-[15px] ${index === 0 ? 'text-home-on-sky' : ''}`}>Today · {item.name}</Label>
          </View>
        </View>) : <View className="w-full rounded-3xl bg-home-surface p-5"><Label className="text-[13px] text-home-muted">No upcoming routines in this demo.</Label></View>}
      </CardStrip></View>
      <View><SectionTitle right="+ Add" onPress={() => onNavigate('composer')}>Your automations</SectionTitle><View className="gap-2">
        <RoutineRow title="Wake up" description="At sunrise, turn on bedroom lights and open blinds" icon="light"/>
        <RoutineRow title="Morning kettle" description="At 10:00 AM today, turn on the kettle" icon="kettle"/>
        <RoutineRow title="Nighttime security" description="At 7:30 PM, lock the doors and turn on the lights" icon="lock" onRun={() => { if (!state.locked) dispatch({ type: 'TOGGLE_LOCK' }); notify('Doors locked in demo'); }}/>
        <RoutineRow title="Friday jam" description={'At 8:00 PM, on Fridays, play “Friday jam”'} icon="speaker"/>
        {state.routines.map(routine => <RoutineRow key={routine.id} {...routine}/>)}
      </View></View>
    </PageColumns></PageScroll>
  </View>;
}
export function RoutinesScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, notify } = useHome();
  return <View className="min-h-0 flex-1 bg-white">
    <PageScroll bottom={96}>{header}<PageColumns>
      <View><SectionTitle>Household Routines</SectionTitle><View className="gap-2">
        <RoutineRow title="Garage motion light" description="1 starter · 1 action" icon="settings"/>
        <RoutineRow title="Movie mode" description="1 starter · 3 actions" icon="light" onRun={() => { dispatch({ type: 'TOGGLE_MOVIE' }); notify(state.movieMode ? 'Movie mode stopped' : 'Movie mode started in demo'); }}/>
        <RoutineRow title="Party time" description="1 starter · 4 actions" icon="speaker"/>
        <RoutineRow title="Home" description="When someone comes home" icon="home" playable={false}/>
        <RoutineRow title="Away" description="When everyone’s away" icon="home" playable={false}/>
        {state.routines.map(routine => <RoutineRow key={routine.id} {...routine}/>)}
      </View></View>
      <View><SectionTitle>Personal Routines</SectionTitle><View className="gap-2"><RoutineRow title="Bedtime" description="Set your home for the night" icon="moon"/><RoutineRow title="Good morning" description="Start your day" icon="sun"/></View></View>
    </PageColumns></PageScroll><AddButton onPress={() => onNavigate('composer')}/>
  </View>;
}
