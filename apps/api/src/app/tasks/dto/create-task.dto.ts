import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TaskStatus {
  Todo = 'Todo',
  InProgress = 'InProgress',
  Done = 'Done',
}

export enum TaskCategory {
  Work = 'Work',
  Personal = 'Personal',
  Other = 'Other',
}

/**
 * DTO for POST /tasks
 * Keep it intentionally small; server will set orgId from req.user.orgId
 * (unless you later allow Owner to target child orgs explicitly).
 */
export class CreateTaskDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
