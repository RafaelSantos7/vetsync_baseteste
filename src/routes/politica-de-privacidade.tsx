import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, LEGAL_INFO } from "@/components/legal-layout";

export const Route = createFileRoute("/politica-de-privacidade")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      subtitle="Esta política explica como o VetSystem coleta, utiliza, armazena e protege os dados tratados na plataforma."
    >
      <LegalSection title="1. Quais dados são coletados">
        <p>
          O VetSystem coleta apenas os dados necessários para o funcionamento do sistema de gestão
          veterinária:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Dados de conta:</strong> nome, e-mail, senha
            (armazenada de forma criptografada), perfil de acesso (administrador, veterinário ou
            recepção) e organização/clínica vinculada.
          </li>
          <li>
            <strong className="text-foreground">Dados de tutores (clientes):</strong> nome,
            telefone, e-mail, documento quando informado, endereço/cidade e observações.
          </li>
          <li>
            <strong className="text-foreground">Dados de animais:</strong> nome, espécie, raça,
            sexo, idade, peso, imagens e informações de identificação.
          </li>
          <li>
            <strong className="text-foreground">Dados clínicos:</strong> prontuários,
            anamnese, diagnósticos, prescrições, vacinas, odontogramas equinos, imagens de
            procedimentos e anexos.
          </li>
          <li>
            <strong className="text-foreground">Agenda e atendimentos:</strong> data, hora,
            categoria, status e observações dos agendamentos.
          </li>
          <li>
            <strong className="text-foreground">Dados financeiros operacionais:</strong>{" "}
            lançamentos de receitas e despesas registrados pela própria clínica.
          </li>
          <li>
            <strong className="text-foreground">Dados técnicos:</strong> registros de acesso,
            data/hora de operações, identificadores de dispositivo/sessão e logs de sincronização.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Finalidade do tratamento">
        <p>Os dados são tratados exclusivamente para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>autenticar usuários e controlar permissões de acesso;</li>
          <li>registrar e consultar o histórico clínico dos animais;</li>
          <li>organizar a agenda de atendimentos da clínica;</li>
          <li>emitir documentos, prescrições e relatórios;</li>
          <li>possibilitar o uso do sistema em campo, inclusive sem conexão;</li>
          <li>garantir segurança, auditoria e integridade das informações.</li>
        </ul>
        <p>
          Não utilizamos os dados para publicidade, perfilamento comercial ou venda a terceiros.
        </p>
      </LegalSection>

      <LegalSection title="3. Dados de clientes, animais, prontuários e agenda">
        <p>
          Os dados de tutores, animais, prontuários e agenda são inseridos pela própria clínica
          usuária, que atua como controladora dessas informações. O VetSystem atua como operador,
          tratando os dados conforme as instruções da clínica.
        </p>
        <p>
          Cada organização possui isolamento lógico de dados: registros são vinculados ao
          identificador da organização e as regras de segurança do banco impedem que uma clínica
          acesse dados de outra.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso da integração com Google Agenda">
        <p>
          A integração com o Google Agenda é opcional e depende de autorização explícita do usuário
          via OAuth. Quando ativada:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            solicitamos apenas a permissão necessária para criar e atualizar eventos de agenda;
          </li>
          <li>
            enviamos ao Google somente informações mínimas do agendamento (título, data, hora e
            observações registradas pelo usuário);
          </li>
          <li>não enviamos prontuários, diagnósticos ou anexos clínicos;</li>
          <li>
            os tokens de acesso são utilizados exclusivamente para a sincronização e podem ser
            revogados a qualquer momento pelo usuário, na conta Google ou nas configurações do
            VetSystem.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Armazenamento e segurança">
        <p>
          Os dados são armazenados em infraestrutura de nuvem com transmissão criptografada (HTTPS/TLS)
          e autenticação por token. O acesso é controlado por perfis de permissão e por políticas de
          segurança no nível de registro do banco de dados.
        </p>
        <p>
          Para permitir o uso offline, uma cópia dos dados da organização pode ser mantida no
          navegador do dispositivo utilizado. Recomendamos o uso de dispositivos protegidos por
          senha e o encerramento da sessão em equipamentos compartilhados.
        </p>
      </LegalSection>

      <LegalSection title="6. Compartilhamento de dados">
        <p>Os dados podem ser compartilhados apenas nas seguintes situações:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>com usuários da própria organização, conforme o perfil de acesso;</li>
          <li>
            com provedores de infraestrutura e serviços essenciais (hospedagem, banco de dados,
            autenticação e, quando ativada, a integração com o Google Agenda);
          </li>
          <li>
            com o destinatário escolhido pelo usuário quando ele opta por compartilhar um documento
            por WhatsApp ou link;
          </li>
          <li>quando houver obrigação legal, regulatória ou ordem judicial.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Direitos do titular conforme a LGPD">
        <p>
          Nos termos da Lei nº 13.709/2018 (LGPD), o titular pode solicitar: confirmação da
          existência de tratamento; acesso aos dados; correção de dados incompletos ou
          desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários;
          portabilidade; informação sobre compartilhamentos; e revogação do consentimento.
        </p>
        <p>
          Solicitações relacionadas a dados de tutores e animais devem ser encaminhadas
          preferencialmente à clínica responsável pelo cadastro. Também atendemos pedidos enviados
          ao contato indicado nesta política.
        </p>
      </LegalSection>

      <LegalSection title="8. Retenção e exclusão de dados">
        <p>
          Os dados são mantidos enquanto a conta estiver ativa ou pelo prazo necessário ao
          cumprimento de obrigações legais aplicáveis à atividade veterinária. Registros excluídos
          pelo usuário são marcados como removidos e deixam de ser exibidos no sistema, podendo ser
          eliminados definitivamente após o encerramento da conta.
        </p>
        <p>
          Dados armazenados localmente no dispositivo são apagados ao limpar os dados do navegador
          ou ao encerrar a sessão do usuário.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies e dados técnicos">
        <p>
          O VetSystem utiliza apenas armazenamento local e cookies estritamente necessários para
          manter a sessão autenticada, preferências de interface e o funcionamento offline. Não
          utilizamos cookies de publicidade ou rastreamento de terceiros para fins comerciais.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato do responsável">
        <p>
          Dúvidas, solicitações de titulares ou incidentes podem ser encaminhados para:
        </p>
        <p className="text-foreground">
          {LEGAL_INFO.company} — CNPJ {LEGAL_INFO.cnpj}
          <br />
          <a href={`mailto:${LEGAL_INFO.email}`} className="text-primary hover:underline">
            {LEGAL_INFO.email}
          </a>
          <br />
          {LEGAL_INFO.city}
        </p>
      </LegalSection>

      <LegalSection title="11. Atualizações desta política">
        <p>
          Esta política pode ser atualizada para refletir mudanças no sistema ou na legislação. A
          versão vigente estará sempre disponível nesta página, com a data da última atualização. O
          uso continuado do VetSystem após a publicação indica ciência das alterações.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
