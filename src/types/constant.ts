export interface Icreatetask {
  title: string;
  description: string;
  completed: boolean;
  due_date: string;
}

export type DisciplineCreateInput = {
  studentId: number;
  reportedById: number;
  incidentDate: Date;
  category: string;
  severity?: string;
  description: string;
  evidenceFiles?: string[];
};

export type DisciplineActionCreateInput = {
  disciplineId: number;
  actionType: string;
  assignedById: number;
  assignedToId?: number;
  startDate?: Date;
  endDate?: Date;
  description: string;
};

export type DisciplineActionUpdateInput = {
  status?: string;
  outcome?: string;
  completedDate?: Date;
};
