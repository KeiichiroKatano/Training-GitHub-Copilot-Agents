import { useApiResource } from '../api/useApiResource.js';

type Activity = { type: string; minutes: number; points: number };
type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  const { data, loading, error } = useApiResource<ActivityResponse>('/api/activities');
  return <section><h2 className="h4">Activities</h2>
    {loading && <p role="status">Loading activities...</p>}
    {error && <p role="alert">Unable to load activities: {error}</p>}
    {data && (data.activities.length === 0
      ? <p>No activities yet.</p>
      : <ul>{data.activities.map((activity, index) => <li key={`${activity.type}-${index}`}>{activity.type}: {activity.minutes} minutes, {activity.points} points</li>)}</ul>)}
  </section>;
}
