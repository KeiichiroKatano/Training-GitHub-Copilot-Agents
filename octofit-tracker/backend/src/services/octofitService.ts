import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Activity details are required');
  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) throw badRequest('A valid userId is required');
  if (typeof teamId !== 'string' || !mongoose.isValidObjectId(teamId)) throw badRequest('A valid teamId is required');
  if (typeof type !== 'string' || !type.trim()) throw badRequest('An activity type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) throw badRequest('Minutes must be a positive number');

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw badRequest('The referenced user or team does not exist');

  return Activity.create({ user: user._id, team: team._id, type: type.trim(), minutes, points: minutes, occurredAt: new Date() });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw badRequest('Team details are required');
  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('A team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('A team mascot is required');
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !mongoose.isValidObjectId(member))) {
    throw badRequest('Members must be valid user IDs');
  }
  if (members.length) {
    const existingMembers = await User.countDocuments({ _id: { $in: members } });
    if (existingMembers !== new Set(members).size) throw badRequest('One or more team members do not exist');
  }
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } }).lean();
  const teamsById = new Map(teams.map((team) => [team._id.toString(), team.name]));
  return totals.flatMap(({ _id, totalPoints }, index) => {
    const teamName = teamsById.get(_id.toString());
    return teamName ? [{ teamName, totalPoints, rank: index + 1 }] : [];
  });
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
    Workout.find().lean(),
  ]);
  const recentTypes = [...new Set(recentActivities.map(({ type }) => type.toLowerCase()))];
  const goal = user.fitnessGoal.toLowerCase();
  const orderedWorkouts = [...workouts].sort((left, right) => {
    const score = (focus: string) => focus.toLowerCase() === goal ? 0 : recentTypes.includes(focus.toLowerCase()) ? 1 : 2;
    return score(left.focus) - score(right.focus);
  });
  const matchedWorkout = orderedWorkouts[0];
  if (!matchedWorkout || (matchedWorkout.focus.toLowerCase() !== goal && !recentTypes.includes(matchedWorkout.focus.toLowerCase()))) {
    return orderedWorkouts.map((workout) => ({ ...workout, reason: `A general suggestion for your ${user.fitnessGoal} goal.` }));
  }
  const activity = recentActivities.find(({ type }) => type.toLowerCase() === matchedWorkout.focus.toLowerCase());
  const reason = matchedWorkout.focus.toLowerCase() === goal
    ? `Recommended for your ${user.fitnessGoal} goal${activity ? ` and recent ${activity.type} activity` : ''}.`
    : `Recommended based on your recent ${activity?.type ?? matchedWorkout.focus} activity.`;
  return orderedWorkouts.map((workout) => ({
    ...workout,
    reason: workout.focus.toLowerCase() === matchedWorkout.focus.toLowerCase() ? reason : `A general suggestion for your ${user.fitnessGoal} goal.`,
  }));
}

export { User };
