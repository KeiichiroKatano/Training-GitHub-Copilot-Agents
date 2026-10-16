import { useApiResource } from '../api/useApiResource.js';

type Team = { name: string; mascot?: string; members: Array<string | { name: string }> };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  const { data, loading, error } = useApiResource<TeamResponse>('/api/teams');
  return <section><h2 className="h4">Teams</h2>
    {loading && <p role="status">Loading teams...</p>}
    {error && <p role="alert">Unable to load teams: {error}</p>}
    {data && (data.teams.length === 0
      ? <p>No teams yet.</p>
      : <ul>{data.teams.map((team) => <li key={team.name}>{team.name}{team.mascot ? ` (${team.mascot})` : ''}. Members: {team.members.map((member) => typeof member === 'string' ? member : member.name).join(', ') || 'None'}</li>)}</ul>)}
  </section>;
}
