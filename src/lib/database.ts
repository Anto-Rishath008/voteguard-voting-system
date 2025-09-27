import { createAdminClient } from "./supabase";
import crypto from "crypto";

// Database utility functions
export class DatabaseUtils {
  private static supabase = createAdminClient();

  // Generate cryptographic hash for vote chaining
  static generateVoteHash(voteData: {
    contestId: number;
    voterId: string;
    candidateId: string;
    timestamp: string;
    previousHash: string | null;
  }): string {
    const data = `${voteData.contestId}:${voteData.voterId}:${
      voteData.candidateId
    }:${voteData.timestamp}:${voteData.previousHash || ""}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  // Get the last vote hash for chaining
  static async getLastVoteHash(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("votes")
      .select("vote_hash")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data.vote_hash;
  }

  // Verify vote chain integrity
  static async verifyVoteChain(voteId: string): Promise<boolean> {
    const { data: vote, error } = await this.supabase
      .from("votes")
      .select("*")
      .eq("vote_id", voteId)
      .single();

    if (error || !vote) return false;

    // Calculate expected hash
    const expectedHash = this.generateVoteHash({
      contestId: vote.contest_id,
      voterId: vote.voter_id,
      candidateId: vote.candidate_id,
      timestamp: vote.vote_timestamp,
      previousHash: vote.previous_vote_hash,
    });

    return expectedHash === vote.vote_hash;
  }

  // Create audit log entry
  static async createAuditLog(
    userId: string | null,
    operationType:
      | "INSERT"
      | "UPDATE"
      | "DELETE"
      | "LOGIN"
      | "LOGOUT"
      | "VOTE_CAST",
    tableName?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    const { error } = await this.supabase.from("audit_log").insert({
      user_id: userId,
      operation_type: operationType,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  // Check user permissions
  static async checkUserRole(
    userId: string,
    requiredRole: "Voter" | "Admin" | "SuperAdmin"
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", userId);

    if (error || !data) return false;

    const userRoles = data.map((role) => role.role_name);

    // SuperAdmin has all permissions
    if (userRoles.includes("SuperAdmin")) return true;

    // Admin has Admin and Voter permissions
    if (requiredRole === "Admin" && userRoles.includes("Admin")) return true;
    if (requiredRole === "Voter" && userRoles.includes("Admin")) return true;

    // Check exact role match
    return userRoles.includes(requiredRole);
  }

  // Get user with roles
  static async getUserWithRoles(userId: string) {
    const { data: user, error: userError } = await this.supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (userError || !user) return null;

    const { data: roles, error: rolesError } = await this.supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", userId);

    if (rolesError) return null;

    return {
      ...user,
      roles: roles.map((r) => r.role_name),
    };
  }

  // Create user session
  static async createUserSession(
    userId: string,
    ipAddress?: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        is_active: true,
      })
      .select("session_id")
      .single();

    if (error || !data) return null;
    return data.session_id;
  }

  // Update session activity
  static async updateSessionActivity(sessionId: string) {
    const { error } = await this.supabase
      .from("user_sessions")
      .update({
        last_seen_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Failed to update session activity:", error);
    }
  }

  // Deactivate user session
  static async deactivateSession(sessionId: string) {
    const { error } = await this.supabase
      .from("user_sessions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Failed to deactivate session:", error);
    }
  }

  // Get active elections for a user's jurisdiction
  static async getActiveElectionsForUser(userId: string) {
    // This would typically involve checking user's jurisdiction
    // For now, return all active elections
    const { data, error } = await this.supabase
      .from("elections")
      .select(
        `
        *,
        contests (
          *,
          candidates (*)
        )
      `
      )
      .eq("status", "Active")
      .lte("start_date", new Date().toISOString())
      .gte("end_date", new Date().toISOString());

    if (error) return [];
    return data;
  }

  // Check if user has already voted in a contest
  static async hasUserVoted(
    userId: string,
    contestId: number,
    electionId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("votes")
      .select("vote_id")
      .eq("voter_id", userId)
      .eq("contest_id", contestId)
      .eq("election_id", electionId)
      .limit(1);

    if (error) return false;
    return data && data.length > 0;
  }

  // Get election results
  static async getElectionResults(electionId: string) {
    const { data, error } = await this.supabase.rpc("get_election_results", {
      election_id_param: electionId,
    });

    if (error) {
      console.error("Error fetching election results:", error);
      return [];
    }
    return data;
  }

  // Create security event
  static async createSecurityEvent(
    sessionId: string | null,
    userId: string | null,
    eventType:
      | "FailedLogin"
      | "UnusualLocation"
      | "MultipleLogins"
      | "SuspiciousActivity",
    severityLevel: "Low" | "Medium" | "High" = "Low",
    description?: string,
    eventData?: any
  ) {
    const { error } = await this.supabase.from("security_events").insert({
      session_id: sessionId,
      user_id: userId,
      event_type: eventType,
      severity_level: severityLevel,
      description,
      event_data: eventData,
    });

    if (error) {
      console.error("Failed to create security event:", error);
    }
  }
}

// SQL functions that should be created in the database
export const customSQLFunctions = `
-- Function to get election results with vote counts
CREATE OR REPLACE FUNCTION get_election_results(election_id_param UUID)
RETURNS TABLE(
  contest_id INTEGER,
  contest_title VARCHAR(255),
  candidate_id UUID,
  candidate_name VARCHAR(255),
  party VARCHAR(255),
  vote_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.contest_id,
    c.contest_title,
    cand.candidate_id,
    cand.candidate_name,
    cand.party,
    COUNT(v.vote_id) as vote_count
  FROM contests c
  LEFT JOIN candidates cand ON c.contest_id = cand.contest_id AND c.election_id = cand.election_id
  LEFT JOIN votes v ON cand.candidate_id = v.candidate_id AND c.contest_id = v.contest_id
  WHERE c.election_id = election_id_param
  GROUP BY c.contest_id, c.contest_title, cand.candidate_id, cand.candidate_name, cand.party
  ORDER BY c.contest_id, vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check vote integrity
CREATE OR REPLACE FUNCTION verify_vote_chain()
RETURNS TABLE(
  vote_id UUID,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  vote_record RECORD;
  calculated_hash VARCHAR(255);
  previous_hash VARCHAR(255);
BEGIN
  FOR vote_record IN 
    SELECT * FROM votes ORDER BY created_at ASC
  LOOP
    -- Get previous hash
    IF vote_record.previous_vote_hash IS NOT NULL THEN
      SELECT vote_hash INTO previous_hash 
      FROM votes 
      WHERE vote_hash = vote_record.previous_vote_hash;
      
      IF previous_hash IS NULL THEN
        RETURN QUERY SELECT vote_record.vote_id, FALSE, 'Invalid previous hash reference';
        CONTINUE;
      END IF;
    END IF;
    
    -- For now, just return valid for all votes
    -- In a real implementation, you'd calculate the hash here
    RETURN QUERY SELECT vote_record.vote_id, TRUE, NULL::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
`;

export default DatabaseUtils;
