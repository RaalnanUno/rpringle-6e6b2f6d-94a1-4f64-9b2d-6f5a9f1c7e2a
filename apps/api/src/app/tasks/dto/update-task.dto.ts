import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TaskCategory, TaskStatus } from './create-task.dto';

/**
 * DTO for PUT /tasks/:id
 * All fields optional; only included fields will be updated.
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

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

  /**
   * Optional: position for drag-and-drop ordering inside a column/status.
   * If you don’t need ordering yet, you can remove this.
   */
  @IsOptional()
  position?: number;
}
