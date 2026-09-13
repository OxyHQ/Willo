import React, { useState } from 'react';
import { View } from 'react-native';
import { Icon, IconButton, Label } from '@willo/ui';
import { PageColumns } from '../layout/page-layout';
import { DEMO_TODAY, MEMBERS, memberName, type Task } from './model';
import { formatDay } from './logic';
import { useHousehold } from './store';
import { CheckControl, Chip, EmptyState, Heading, Panel, Person } from './ui';

export function TasksScreen() {
  const { state, dispatch, openEditor } = useHousehold();
  const [filter, setFilter] = useState('Today');
  const [owner, setOwner] = useState('Everyone');
  const completed = state.tasks.filter(task => task.completion?.date === DEMO_TODAY);
  const visible = state.tasks.filter(task => (owner === 'Everyone' || task.assignee === owner || (filter === 'Completed' && task.completion?.by === owner)) &&
    (filter === 'Completed' ? task.completion?.date === DEMO_TODAY : filter === 'Today' ? task.due <= DEMO_TODAY && !task.completion : task.due > DEMO_TODAY));
  function handleEdit(task: Task) {
    openEditor('task', { title: task.title, date: task.due, category: task.category, repeat: task.repeat, member: task.assignee, rotate: task.rotate ? 'yes' : 'no' }, task.id);
  }
  return <PageColumns weights={[1.65, 1]}>
    <View className="gap-4"><View className="flex-row flex-wrap gap-2">{['Today', 'Upcoming', 'Completed'].map(title => <Chip key={title} title={title} selected={filter === title} onPress={() => setFilter(title)}/>)}</View>
      <View className="flex-row flex-wrap gap-2"><Chip title="Everyone" selected={owner === 'Everyone'} onPress={() => setOwner('Everyone')}/>{MEMBERS.map(member => <Chip key={member.id} title={member.name} selected={owner === member.id} onPress={() => setOwner(member.id)}/>)}</View>
      <Heading title={filter === 'Today' ? 'A few little things' : filter} detail={`${visible.length} tasks · ${completed.length} completed today`}/>
      {!visible.length && <EmptyState title="All clear here" body="Try another person or day, or add a new task."/>}
      {visible.map(task => <View key={task.id} className="rounded-[24px] bg-home-surface p-3">
        <View className="flex-row items-center gap-2"><CheckControl checked={task.completion?.date === DEMO_TODAY} label={`${task.completion ? 'Undo' : 'Complete'} ${task.title}`} onPress={() => dispatch({ type: 'complete-task', id: task.id })}/>
          <View className="min-w-0 flex-1 gap-1"><Label className={`text-[15px] font-medium ${filter === 'Completed' ? 'line-through text-home-muted' : ''}`}>{task.title}</Label>
            <Label className="text-[12px] text-home-muted">{task.category} · {task.repeat === 'once' ? formatDay(task.due) : task.repeat}{task.rotate ? ' · Takes turns' : ''}</Label></View>
          <Person id={task.assignee}/><IconButton icon="chevron" label={`Edit ${task.title}`} onPress={() => handleEdit(task)} size={16}/></View>
        {task.completion && <Label className="ml-12 mt-2 text-[11px] text-home-on-sky">Done by {memberName(task.completion.by)}{task.repeat !== 'once' ? ` · Next ${formatDay(task.due)}, ${memberName(task.assignee)}` : ''}</Label>}
      </View>)}
    </View>
    <View className="gap-5"><Panel tone="blue"><Icon name="heart" color="#064aba" size={28}/><Label className="text-[28px] leading-9 text-home-on-blue">A home is a team effort.</Label>
      <Label className="text-[13px] leading-5 text-home-on-blue">Set a repeat, pick a person, or let the next turn rotate through your household.</Label></Panel>
      <Panel title="Sharing the load">{MEMBERS.map(member => {
        const assigned = state.tasks.filter(task => task.assignee === member.id && !task.completion);
        return <View key={member.id} className="flex-row items-center justify-between"><Person id={member.id} caption/><Label className="text-[13px] text-home-muted">{assigned.length} assigned</Label></View>;
      })}</Panel>
      <Label className="text-[12px] leading-5 text-home-muted">Completing a recurring task creates its next due date in this session. It does not schedule a notification.</Label>
    </View>
  </PageColumns>;
}
