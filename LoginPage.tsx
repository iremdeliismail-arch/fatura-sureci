import { useNavigate } from 'react-router-dom'
import { USERS } from '../data/mock'
import { useAuth } from '../context/AuthContext'

const roleHint: Record<string, string> = {
  accounting: 'Fatura girişi, mapping, revizyon / tedarikçi düzeltmesi ve muhasebe son kontrol',
  manager: 'Jira satın alma linki girer, kodlar, onaylar, reddeder veya revizyona gönderir',
  admin: 'Tanımlar, vekalet, satır onayı ve denetim kaydı',
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="mb-10 text-white">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-lg font-bold">
            F
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fatura Yönetim</h1>
          <p className="mt-2 max-w-xl text-sm text-white/65">
            Tedarikçi faturalarını kaynaktan E-LOGO aktarımına kadar aynı akışta yönetin. Prototipi denemek için bir
            kullanıcı seçin.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                login(u.id)
                navigate('/')
              }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-white transition hover:border-teal-400/40 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-100">
                  {u.initials}
                </div>
                <div>
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-white/55">{u.title}</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/50">{roleHint[u.role]}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
