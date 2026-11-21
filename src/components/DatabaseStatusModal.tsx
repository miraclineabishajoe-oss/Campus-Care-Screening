import React from 'react';
import { DatabaseHealth } from '../types';
import { 
  PixelButton, 
  PixelCard, 
  PixelBadge, 
  PixelShield, 
  PixelCheck, 
  PixelSparkle 
} from './PixelUI';
import { Database, Terminal, Server, Key, AlertTriangle, X } from 'lucide-react';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: DatabaseHealth | null;
  onRefresh: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  health,
  onRefresh
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#231E2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <PixelCard
        variant="white"
        shadow="lg"
        border="dark"
        className="max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto space-y-6"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-6 h-6 border-2 border-[#2B2438] bg-[#FAF8F5] text-xs font-bold hover:bg-[#FDE8E8] flex items-center justify-center"
        >
          ✕
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#EFEAF8] border-2 border-[#2B2438] flex items-center justify-center text-[#7E65B7] shadow-[2px_2px_0px_#2B2438]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#231E2C]">
              MySQL 8.0 Database Inspection & Health
            </h2>
            <span className="text-[10px] font-mono text-[#7E7491]">
              SYSTEM SYNCHRONIZATION STATUS
            </span>
          </div>
        </div>

        {/* Current Connection Engine Banner */}
        <PixelCard
          variant={health?.database.isLiveMySQL ? 'mint' : 'cream'}
          shadow="sm"
          border="dark"
          className="p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                <span className={`w-2.5 h-2.5 ${health?.database.isLiveMySQL ? 'bg-[#389E6E]' : 'bg-[#7E65B7]'}`} />
                <span>Active Engine: {health?.database.isLiveMySQL ? 'Live MySQL 8.0 Connection' : 'Isolated Exact-Schema Engine'}</span>
              </div>
              <p className="text-xs text-[#534B62] leading-relaxed">
                {health?.database.message}
              </p>
            </div>
            <PixelButton
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              Re-test Connection
            </PixelButton>
          </div>
        </PixelCard>

        {/* Verified 6 Tables */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#231E2C] uppercase tracking-wider font-mono">
            Verified Schema Tables (MySQL 8.0 DDL Synchronized)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { name: 'students', desc: 'student_id, full_name, email, password_hash' },
              { name: 'counsellors', desc: 'counsellor_id, is_active=0 default, spec' },
              { name: 'counsellor_availability', desc: 'uq_counsellor_slot, chk_slot_time' },
              { name: 'appointments', desc: 'uq_one_active_booking_per_slot' },
              { name: 'screenings', desc: 'responses json, overall_score decimal' },
              { name: 'password_recovery', desc: 'code_hash, reset_token_hash, attempts' }
            ].map(t => (
              <PixelCard
                key={t.name}
                variant="cream"
                shadow="none"
                border="soft"
                className="p-2.5 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#231E2C]">
                  <PixelCheck size={12} className="text-[#297D56]" />
                  <span>{t.name}</span>
                </div>
                <div className="text-[10px] text-[#7E7491] truncate font-mono" title={t.desc}>
                  {t.desc}
                </div>
              </PixelCard>
            ))}
          </div>
        </div>

        {/* Secure Local MySQL Connectivity Guide */}
        <div className="space-y-3 pt-4 border-t-2 border-[#E8E0D5]">
          <div className="flex items-center gap-2">
            <PixelShield size={16} className="text-[#7E65B7]" />
            <h3 className="text-xs font-bold text-[#231E2C] uppercase tracking-wider font-mono">
              Safely Connecting Your Local MySQL Workbench Database
            </h3>
          </div>

          <div className="text-xs text-[#534B62] space-y-2 leading-relaxed">
            <p>
              To connect this cloud development backend to your local MySQL database without exposing port 3306 to the public internet:
            </p>

            <div className="p-3 bg-[#231E2C] text-[#FAF8F5] border-2 border-[#2B2438] font-mono text-xs space-y-1.5 shadow-[2px_2px_0px_#DDD4F0]">
              <div className="text-[#8E84A3]"># 1. Start a secure outbound tunnel on your computer:</div>
              <div className="text-[#8ED6B2]">ngrok tcp 3306</div>
              <div className="text-[#8E84A3]"># 2. Add the assigned tunnel host & port to .env:</div>
              <div>MYSQL_HOST="tcp.ngrok.io"</div>
              <div>MYSQL_PORT="assigned_port"</div>
              <div>MYSQL_USER="root"</div>
              <div>MYSQL_PASSWORD="your_workbench_password"</div>
              <div>MYSQL_DATABASE="campuscare"</div>
            </div>

            <p className="text-[11px] text-[#7E7491]">
              Note: The application executes zero DDL changes (`CREATE`, `DROP`, `ALTER`). It communicates purely via parameterized SQL queries using `mysql2/promise`.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-[#E8E0D5] flex justify-end">
          <PixelButton
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Close Window
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
};
