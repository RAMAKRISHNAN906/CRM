import { useQuery } from '@tanstack/react-query';
import { Users, Crown, User } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  manager: TeamMember;
  members: TeamMember[];
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-red-400 bg-red-500/20',
  ADMIN: 'text-orange-400 bg-orange-500/20',
  MANAGER: 'text-violet-400 bg-violet-500/20',
  SALES_REP: 'text-blue-400 bg-blue-500/20',
  SUPPORT: 'text-green-400 bg-green-500/20',
  USER: 'text-gray-400 bg-gray-500/20',
};

export default function TeamPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get('/teams');
      return res.data.data as Team[];
    },
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Use activity log to get user list or a users endpoint
      const res = await api.get('/auth/me');
      return [res.data.data]; // placeholder — extend with a /users endpoint
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team & Hierarchy</h1>
        <p className="text-white/50 text-sm mt-1">Manage teams, roles, and reporting structure</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {teams && teams.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No teams created yet.</p>
          <p className="text-xs mt-1">Teams can be created via the API or by an administrator.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams?.map((team: Team) => (
          <Card key={team.id} className="p-5 border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{team.name}</h3>
                {team.description && <p className="text-white/40 text-xs">{team.description}</p>}
              </div>
            </div>

            {/* Manager */}
            <div className="mb-3">
              <p className="text-white/40 text-xs mb-2">Manager</p>
              <div className="flex items-center gap-2 p-2 bg-violet-500/10 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-violet-500/30 flex items-center justify-center">
                  <Crown className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{team.manager.name}</p>
                  <p className="text-white/40 text-xs">{team.manager.email}</p>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <p className="text-white/40 text-xs mb-2">Members ({team.members?.length || 0})</p>
              <div className="space-y-2">
                {team.members?.map((member: TeamMember) => (
                  <div key={member.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      {member.avatar
                        ? <img src={member.avatar} className="w-7 h-7 rounded-full object-cover" alt={member.name} />
                        : <User className="w-3.5 h-3.5 text-white/50" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{member.name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role] || ROLE_COLORS.USER}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
