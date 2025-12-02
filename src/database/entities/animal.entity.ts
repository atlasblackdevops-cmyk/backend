import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { AnimalFeed } from "./animal-feed.entity";
import { AnimalHealthRecord } from "./animal-health-record.entity";
import { AnimalWeightRecord } from "./animal-weight-record.entity";
import { Farm } from "./farm.entity";
import { User } from "./user.entity";

@Entity({ name: "animals" })
export class Animal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Farm, { nullable: false })
  @JoinColumn({ name: "farm_id" })
  farm: Farm;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  species: string | null;

  @Column({ type: "varchar", nullable: true })
  breed: string | null;

  @Column({ type: "varchar", nullable: true })
  gender: string | null;

  @Column({ type: "date", nullable: true })
  birthdate: Date | null;

  @Column({ type: "varchar", nullable: true })
  photo: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy: User | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  createdAt: Date | null;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  updatedAt: Date | null;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  deletedAt: Date | null;

  @OneToMany(() => AnimalHealthRecord, (healthRecord) => healthRecord.animal)
  healthRecords: AnimalHealthRecord[];

  @OneToMany(() => AnimalFeed, (feed) => feed.animal)
  feeds: AnimalFeed[];

  @OneToMany(() => AnimalWeightRecord, (weightRecord) => weightRecord.animal)
  weightRecords: AnimalWeightRecord[];
}
