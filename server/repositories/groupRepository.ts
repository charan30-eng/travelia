/**
 * TRAVELIA GROUP REPOSITORY
 * 
 * Manages group members for a trip in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/connection';
import { GroupMember } from '../../src/types';

export class GroupRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  findByTripId(tripId: string): GroupMember[] {
    const stmt = this.db.prepare(`
      SELECT id, trip_id as tripId, name, email, role, avatar, status, created_at as createdAt
      FROM group_members
      WHERE trip_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(tripId) as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      role: r.role as any,
      status: r.status as any,
      voteCount: 0
    }));
  }

  create(tripId: string, member: Partial<GroupMember>): GroupMember {
    const id = member.id || `member-${tripId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.db.prepare(`
      INSERT INTO group_members (id, trip_id, name, email, role, avatar, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      tripId,
      member.name || 'New Member',
      (member as any).email || null,
      member.role || 'co-traveler',
      member.avatar || null,
      member.status || 'active'
    );

    return {
      id,
      name: member.name || 'New Member',
      avatar: member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      role: (member.role || 'co-traveler') as any,
      status: (member.status || 'active') as any,
      voteCount: 0
    };
  }

  delete(tripId: string, memberId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM group_members WHERE id = ? AND trip_id = ?');
    return stmt.run(memberId, tripId).changes > 0;
  }
}

export const groupRepository = new GroupRepository();
