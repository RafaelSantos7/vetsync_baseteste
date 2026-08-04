import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, LEGAL_INFO } from "@/components/legal-layout";

export const Route = createFileRoute("/termos")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      title="Termos de Uso"
      subtitle="Estes termos regulam o acesso e a utilização do VetSystem por clínicas, veterinários e equipes autorizadas."
    >
      <LegalSection title="1. Descrição do VetSystem">
        <p>
          O VetSystem é uma plataforma web de gestão veterinária que reúne cadastro de tutores e
          animais, prontuários eletrônicos, controle de vacinas, odontograma equino, agenda de
          atendimentos, visitas rurais e controle financeiro operacional da clínica.
        </p>
      </LegalSection>

      <LegalSection title="2. Regras de acesso">
        <p>
          O acesso é restrito a usuários cadastrados por um administrador da organização. Cada
          usuário recebe um perfil (administrador, veterinário ou recepção) que define os módulos
          disponíveis. É proibido compartilhar credenciais ou utilizar contas de terceiros.
        </p>
      </LegalSection>

      <LegalSection title="3. Responsabilidades do usuário">
        <ul className="list-disc space-y-1 pl-5">
          <li>garantir a veracidade e a atualização dos dados inseridos;</li>
          <li>obter as autorizações necessárias dos tutores para o tratamento de dados;</li>
          <li>manter sigilo profissional sobre as informações clínicas acessadas;</li>
          <li>utilizar o sistema conforme a legislação e as normas do conselho profissional.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso adequado do sistema">
        <p>
          É vedado utilizar o VetSystem para fins ilícitos, inserir conteúdo ofensivo ou de
          terceiros sem autorização, tentar burlar controles de permissão, realizar engenharia
          reversa, sobrecarregar a infraestrutura ou extrair dados de forma automatizada não
          autorizada.
        </p>
      </LegalSection>

      <LegalSection title="5. Funcionamento offline e sincronização">
        <p>
          O sistema permite operação sem conexão à internet, mantendo os dados em uma base local no
          dispositivo. Quando a conexão é restabelecida, os registros são sincronizados
          automaticamente com o servidor.
        </p>
        <p>
          O usuário reconhece que, durante o período offline, informações inseridas por outros
          usuários podem não estar visíveis e que conflitos de edição simultânea podem exigir
          revisão manual. Recomenda-se sincronizar sempre que houver conexão disponível.
        </p>
      </LegalSection>

      <LegalSection title="6. Integração com Google Agenda">
        <p>
          A integração é opcional e requer autorização do usuário. Ao ativá-la, os agendamentos
          podem ser criados ou atualizados na agenda Google vinculada. O usuário é responsável pela
          conta Google utilizada e pode revogar o acesso a qualquer momento. Falhas ou indisponibilidades
          do serviço Google estão fora do nosso controle.
        </p>
      </LegalSection>

      <LegalSection title="7. Compartilhamento de prontuários pelo WhatsApp">
        <p>
          O sistema permite gerar documentos em PDF e compartilhá-los por WhatsApp ou link. O envio é
          uma ação deliberada do usuário, que é integralmente responsável pelo destinatário
          escolhido, pelo conteúdo enviado e pelo sigilo das informações. Após o envio, o conteúdo
          passa a estar fora do ambiente controlado do VetSystem.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade do serviço">
        <p>
          Trabalhamos para manter o sistema disponível de forma contínua, mas não garantimos operação
          ininterrupta. Podem ocorrer paradas para manutenção, atualizações ou por falhas de
          terceiros (conectividade, hospedagem e serviços integrados).
        </p>
      </LegalSection>

      <LegalSection title="9. Proteção de credenciais">
        <p>
          Cada usuário é responsável por manter a confidencialidade de sua senha e por todas as ações
          realizadas com sua conta. Suspeitas de acesso indevido devem ser comunicadas imediatamente
          ao administrador da organização e ao contato indicado nestes termos.
        </p>
      </LegalSection>

      <LegalSection title="10. Propriedade intelectual">
        <p>
          O software, a marca VetSystem, a interface, os códigos e os materiais associados pertencem
          aos seus titulares e são protegidos por lei. É concedida apenas uma licença de uso, não
          exclusiva e não transferível, durante a vigência da contratação. Os dados clínicos e
          cadastrais inseridos permanecem de titularidade da clínica usuária.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitações de responsabilidade">
        <p>
          O VetSystem é uma ferramenta de registro e organização e não substitui o julgamento
          clínico do profissional. Não nos responsabilizamos por decisões clínicas, por dados
          incorretos inseridos pelos usuários, por perdas decorrentes de uso indevido, nem por danos
          indiretos ou lucros cessantes, na máxima extensão permitida pela legislação aplicável.
        </p>
      </LegalSection>

      <LegalSection title="12. Suspensão de acesso">
        <p>
          O acesso poderá ser suspenso em caso de violação destes termos, uso indevido, risco à
          segurança da plataforma ou inadimplência, com comunicação ao responsável da organização
          sempre que possível.
        </p>
      </LegalSection>

      <LegalSection title="13. Cancelamento">
        <p>
          A organização pode solicitar o cancelamento a qualquer momento pelo contato indicado. Antes
          do encerramento, recomendamos exportar os dados necessários. Após o cancelamento, os dados
          poderão ser eliminados conforme os prazos descritos na Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="14. Alterações dos termos">
        <p>
          Estes termos podem ser alterados a qualquer momento, com publicação da versão atualizada
          nesta página. O uso continuado do sistema após a publicação implica aceitação das novas
          condições.
        </p>
      </LegalSection>

      <LegalSection title="15. Legislação aplicável">
        <p>
          Aplica-se a legislação brasileira, em especial o Código Civil, o Código de Defesa do
          Consumidor (quando cabível), o Marco Civil da Internet e a Lei Geral de Proteção de Dados
          (Lei nº 13.709/2018). Fica eleito o foro do domicílio do contratante para dirimir
          eventuais controvérsias.
        </p>
      </LegalSection>

      <LegalSection title="16. Contato">
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
    </LegalLayout>
  );
}
