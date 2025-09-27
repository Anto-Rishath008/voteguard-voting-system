export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          azure_ad_user_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          status: "Active" | "Inactive" | "Suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          azure_ad_user_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          status?: "Active" | "Inactive" | "Suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          azure_ad_user_id?: string | null;
          email?: string;
          first_name?: string;
          last_name?: string;
          status?: "Active" | "Inactive" | "Suspended";
          created_at?: string;
          updated_at?: string;
        };
      };
      elections: {
        Row: {
          election_id: string;
          election_name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          status: "Draft" | "Active" | "Completed" | "Cancelled";
          creator: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          election_id?: string;
          election_name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          status?: "Draft" | "Active" | "Completed" | "Cancelled";
          creator: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          election_id?: string;
          election_name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          status?: "Draft" | "Active" | "Completed" | "Cancelled";
          creator?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contests: {
        Row: {
          contest_id: number;
          election_id: string;
          contest_title: string;
          contest_type: "ChooseOne" | "YesNo";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          contest_id?: number;
          election_id: string;
          contest_title: string;
          contest_type: "ChooseOne" | "YesNo";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contest_id?: number;
          election_id?: string;
          contest_title?: string;
          contest_type?: "ChooseOne" | "YesNo";
          created_at?: string;
          updated_at?: string;
        };
      };
      candidates: {
        Row: {
          candidate_id: string;
          contest_id: number;
          candidate_name: string;
          party: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          candidate_id?: string;
          contest_id: number;
          candidate_name: string;
          party?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          candidate_id?: string;
          contest_id?: number;
          candidate_name?: string;
          party?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      votes: {
        Row: {
          vote_id: string;
          contest_id: number;
          voter_id: string;
          candidate_id: string;
          vote_timestamp: string;
          vote_hash: string;
          previous_vote_hash: string | null;
          session_id: string;
          created_at: string;
        };
        Insert: {
          vote_id?: string;
          contest_id: number;
          voter_id: string;
          candidate_id: string;
          vote_timestamp?: string;
          vote_hash: string;
          previous_vote_hash?: string | null;
          session_id: string;
          created_at?: string;
        };
        Update: {
          vote_id?: string;
          contest_id?: number;
          voter_id?: string;
          candidate_id?: string;
          vote_timestamp?: string;
          vote_hash?: string;
          previous_vote_hash?: string | null;
          session_id?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_name: "Voter" | "Admin" | "SuperAdmin";
          assigned_by: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_name: "Voter" | "Admin" | "SuperAdmin";
          assigned_by: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_name?: "Voter" | "Admin" | "SuperAdmin";
          assigned_by?: string;
          created_at?: string;
        };
      };
      user_sessions: {
        Row: {
          session_id: string;
          user_id: string;
          ip_address: string | null;
          login_timestamp: string;
          last_seen_timestamp: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          session_id?: string;
          user_id: string;
          ip_address?: string | null;
          login_timestamp?: string;
          last_seen_timestamp?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          ip_address?: string | null;
          login_timestamp?: string;
          last_seen_timestamp?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_log: {
        Row: {
          audit_id: string;
          user_id: string | null;
          operation_type: "INSERT" | "UPDATE" | "LOGIN" | "VOTE_CAST";
          table_name: string | null;
          record_id: string | null;
          old_values: any | null;
          new_values: any | null;
          timestamp: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          audit_id?: string;
          user_id?: string | null;
          operation_type: "INSERT" | "UPDATE" | "LOGIN" | "VOTE_CAST";
          table_name?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          timestamp?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          audit_id?: string;
          user_id?: string | null;
          operation_type?: "INSERT" | "UPDATE" | "LOGIN" | "VOTE_CAST";
          table_name?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          timestamp?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      jurisdictions: {
        Row: {
          jurisdiction_id: number;
          jurisdiction_name: string;
          parent_jurisdiction_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          jurisdiction_id?: number;
          jurisdiction_name: string;
          parent_jurisdiction_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          jurisdiction_id?: number;
          jurisdiction_name?: string;
          parent_jurisdiction_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      election_jurisdictions: {
        Row: {
          election_id: string;
          jurisdiction_id: number;
          created_at: string;
        };
        Insert: {
          election_id: string;
          jurisdiction_id: number;
          created_at?: string;
        };
        Update: {
          election_id?: string;
          jurisdiction_id?: number;
          created_at?: string;
        };
      };
      system_configuration: {
        Row: {
          config_key: string;
          config_value: string;
          is_encrypted: boolean;
          modified_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          config_key: string;
          config_value: string;
          is_encrypted?: boolean;
          modified_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          config_key?: string;
          config_value?: string;
          is_encrypted?: boolean;
          modified_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
