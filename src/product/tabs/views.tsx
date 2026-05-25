// Views tab — wave-9 mounts the ViewList editor; wave-1's read-only
// list is superseded.

import { describeTab } from '../navigation/tab-descriptor.ts';
import { ViewList } from '../views/view-list.tsx';
import { EventList } from '../events/event-list.tsx';

const TAB = describeTab('views');

export function ViewsTab() {
  return (
    <section className="shijing-tab shijing-tab--views" aria-labelledby="shijing-views-heading">
      <header className="shijing-tab__header">
        <div>
          <p className="shijing-tab__eyebrow">View · 主体集合 + 时间窗口</p>
          <h2 id="shijing-views-heading">{TAB.chinese_label}</h2>
        </div>
      </header>
      <ViewList />
      <EventList />
    </section>
  );
}
