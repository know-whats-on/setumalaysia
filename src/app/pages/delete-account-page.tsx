import { ArrowLeft, Mail, Smartphone, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';

export function DeleteAccountPage() {
  const navigate = useNavigate();
  const isSetuChina = APP_CONFIG.variant === 'setu_china';
  const isJomSettle = APP_CONFIG.variant === 'jom_settle';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#B91C1C] rounded-lg flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-[#0F172A]">{isSetuChina ? 'Delete Account / 删除账户' : 'Delete Account'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-2xl mx-auto w-full">
        <h1 className="text-lg font-bold text-[#0F172A] mb-4">
          {isSetuChina ? `Delete your ${APP_CONFIG.displayName} account / 删除你的 ${APP_CONFIG.displayName} 账户` : `Delete your ${APP_CONFIG.displayName} account`}
        </h1>
        <p className="text-xs text-[#64748B] leading-relaxed mb-6">
          {isSetuChina
            ? `This page is for ${APP_CONFIG.displayName}. You can request deletion of your ${APP_CONFIG.displayName} account and associated data in either of these ways. 你可以通过以下方式删除账户和关联数据：`
            : `You can request deletion of your ${APP_CONFIG.displayName} account and associated data in either of these ways:`}
        </p>

        <div className="flex items-start gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-3">
          <div className="w-8 h-8 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0F172A] mb-1">
              {isSetuChina ? `1. In the ${APP_CONFIG.displayName} app / 在应用内删除` : `1. In the ${APP_CONFIG.displayName} app`}
            </p>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {isSetuChina ? (
                <>
                  Go to <span className="font-medium text-[#0F172A]">Profile 我的</span> and use <span className="font-medium text-[#0F172A]">Delete Account / 删除账户</span>.
                </>
              ) : (
                <>
                  Go to <span className="font-medium text-[#0F172A]">{isJomSettle ? 'Profile' : 'Profile / Vault'}</span> and use the <span className="font-medium text-[#0F172A]">Delete Account</span> option.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-6">
          <div className="w-8 h-8 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-4 h-4 text-[#1E40AF]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0F172A] mb-1">{isSetuChina ? '2. By email / 通过邮件' : '2. By email'}</p>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {isSetuChina ? `Send a deletion request with the subject "Delete my ${APP_CONFIG.displayName} account" from your linked email address to ` : 'Send a deletion request to '}
              <a href={APP_CONFIG.supportMailto} className="text-[#1E40AF] font-medium hover:underline">
                {APP_CONFIG.supportEmail}
              </a>{' '}
              {isSetuChina ? `。请使用绑定 ${APP_CONFIG.displayName} 账户的邮箱发送。` : `from the email address linked to your ${APP_CONFIG.displayName} account.`}
            </p>
          </div>
        </div>

        <h2 className="text-sm font-bold text-[#0F172A] mb-3">{isSetuChina ? 'What will be deleted / 会删除哪些数据' : 'What will be deleted'}</h2>
        <ul className="space-y-2 mb-6">
          {(isSetuChina
            ? [
                'Profile information / 个人资料',
                'Saved checklist and resources activity / 清单和资源使用记录',
                'Rental safety records / 租房安全记录',
                'Plans, alerts, and assistant-linked data / 计划、通知和助手相关数据',
                'Push notification tokens and app preferences / 推送通知令牌和应用偏好',
                'Associated uploaded files / 关联上传文件',
              ]
            : isJomSettle
              ? [
                  'Profile information',
                  'Arrival checklist progress',
                  'Plans, alerts, and assistant-linked data',
                  'Rental safety records',
                  'Associated uploaded files',
                ]
              : [
                'Profile information',
                'Evidence vault items',
                'Rental history',
                'Legal case records',
                'Associated uploaded files',
              ]).map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-xs text-[#64748B]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]/60 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <h2 className="text-sm font-bold text-[#0F172A] mb-3">{isSetuChina ? 'What may be kept / 可能保留哪些数据' : 'What may be kept'}</h2>
        <ul className="space-y-2 mb-6">
          {(isSetuChina
            ? [
                'Support emails or deletion-request records needed to verify and complete the request / 为验证和完成请求所需的客服邮件或删除记录',
                'Security, abuse-prevention, audit, or legal-compliance records where required / 因安全、防滥用、审计或法律合规需要保留的记录',
                'Aggregated or anonymized analytics that no longer identify your account / 不再识别个人账户的汇总或匿名分析数据',
              ]
            : [
                'Support emails or deletion-request records needed to verify and complete the request',
                'Security, abuse-prevention, audit, or legal-compliance records where required',
                'Aggregated or anonymized analytics that no longer identify your account',
              ]).map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-xs text-[#64748B]">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#64748B]/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-[#E2E8F0] pt-4 space-y-2">
          <p className="text-xs text-[#64748B] leading-relaxed">
            {isSetuChina
              ? 'We aim to complete verified deletion requests within 30 days. Backup copies and system logs are removed during routine rotation, usually within 30 days. Records that must be kept for security, fraud prevention, dispute handling, or legal compliance may be retained for up to 90 days unless a longer period is required by law. 完成验证后，我们通常会在 30 天内处理删除请求。备份和系统日志通常会在 30 天内随例行轮换删除。因安全、防欺诈、争议处理或法律合规必须保留的记录，最长可能保留 90 天；法律要求更长时间的除外。'
              : 'We aim to complete verified deletion requests within 30 days. Backup copies and system logs are removed during routine rotation, usually within 30 days. Records that must be kept for security, fraud prevention, dispute handling, or legal compliance may be retained for up to 90 days unless a longer period is required by law.'}
          </p>
          <p className="text-xs text-[#64748B] leading-relaxed">
            If you need help, contact{' '}
            <a href={APP_CONFIG.supportMailto} className="text-[#1E40AF] font-medium hover:underline">
              {APP_CONFIG.supportEmail}
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
