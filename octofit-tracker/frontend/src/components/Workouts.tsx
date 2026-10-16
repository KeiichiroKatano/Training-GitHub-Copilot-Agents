import { useState, type FormEvent } from 'react';
import { useApiResource } from '../api/useApiResource.js';

type Workout = { title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
type WorkoutResponse = { suggestions: Workout[] };

export default function Workouts() {
  const [email, setEmail] = useState('mona@example.com');
  const [requestedEmail, setRequestedEmail] = useState('mona@example.com');
  const { data, loading, error } = useApiResource<WorkoutResponse>(`/api/workouts/suggestions/${encodeURIComponent(requestedEmail)}`);
  function requestSuggestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedEmail(email.trim());
  }

  return <section><h2 className="h4">Workout suggestions</h2>
    <form className="d-flex gap-2 mb-3" onSubmit={requestSuggestions}>
      <label className="visually-hidden" htmlFor="workout-email">User email</label>
      <input id="workout-email" className="form-control" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <button className="btn btn-primary" type="submit">Get suggestions</button>
    </form>
    {loading && <p role="status">Loading workout suggestions...</p>}
    {error && <p role="alert">Unable to load workout suggestions: {error}</p>}
    {data && (data.suggestions.length === 0
      ? <p>No workout suggestions yet.</p>
      : <ul>{data.suggestions.map((workout) => <li key={workout.title}><strong>{workout.title}</strong>{workout.focus ? `: ${workout.focus}` : ''}{workout.minutes ? `, ${workout.minutes} minutes` : ''}{workout.difficulty ? ` (${workout.difficulty})` : ''}{workout.reason ? ` - ${workout.reason}` : ''}</li>)}</ul>)}
  </section>;
}
