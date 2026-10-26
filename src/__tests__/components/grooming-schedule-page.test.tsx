import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroomingSchedulePage } from "@/components/grooming/grooming-schedule-page";
import type { GroomingAgendaDTO, GroomingAppointmentDTO } from "@/dtos/grooming.dto";

vi.stubGlobal("React", React);

const mocks = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), saveProfessional: vi.fn(), useAgenda: vi.fn(), pending: false }));
vi.mock("@/hooks/use-grooming", () => ({
  useGroomingAgenda: mocks.useAgenda,
  useGroomingCalendar: () => ({ data: { appointments: [], blocks: [] } }),
  useCreateGroomingAppointment: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateGroomingAppointment: () => ({ mutateAsync: mocks.update, isPending: mocks.pending }),
  useSaveGroomingProfessional: () => ({ mutateAsync: mocks.saveProfessional, isPending: false }),
  useSaveGroomingService: () => ({}),
  useCreateGroomingBlock: () => ({}),
  useDeleteGroomingBlock: () => ({})
}));
vi.mock("@/components/customers/customer-create-form", () => ({ CustomerCreateForm: () => null }));

const appointment: GroomingAppointmentDTO = {
  id: "appointment-1", startAt: "2026-10-20T12:00:00.000Z", endAt: "2026-10-20T13:30:00.000Z", status: "CONFIRMED",
  price: 90, commissionAmount: 0, isPackage: false, purchasedProducts: false, photoTaken: false, reminderSentAt: null,
  customer: { id: "customer-1", name: "Mônica" },
  pet: { id: "pet-1", name: "Pitchula", species: "Cachorro" },
  service: { id: "service-1", name: "Banho e tosa", durationMinutes: 60, defaultPrice: 90 },
  professional: { id: "professional-1", name: "Juliana", commissionPercent: 0 }
};

function agendaWith(item = appointment): GroomingAgendaDTO {
  return { date: "2026-10-20", appointments: [item], reminders: [item], professionals: [item.professional], services: [item.service], customers: [], blocks: [] };
}

function openEditor(index = 0) {
  fireEvent.click(screen.getAllByRole("button", { name: "Editar horário" })[index]);
  return screen.getByRole("dialog", { name: "Editar horário" });
}

describe("correção do horário na agenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending = false;
    mocks.update.mockResolvedValue({ updated: true });
    mocks.useAgenda.mockReturnValue({ data: agendaWith(), isPending: false, isError: false });
  });

  it.each([0, 1])("abre a edição pelo lembrete ou pelo atendimento: %s", (index) => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor(index);

    expect(within(dialog).getByLabelText("Data do atendimento")).toHaveValue("2026-10-20");
    expect(within(dialog).getByLabelText("Horário inicial")).toHaveValue("09:00");
    expect(within(dialog).getByText("09:00 até 10:30")).toBeInTheDocument();
    expect(within(dialog).getByText("Duração: 1h 30min.")).toBeInTheDocument();
  });

  it("salva o novo horário no mesmo agendamento com o fuso de São Paulo e abre o novo dia", async () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Data do atendimento"), { target: { value: "2026-10-21" } });
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "14:15" } });
    expect(within(dialog).getByText("14:15 até 15:45")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar horário" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.update).toHaveBeenCalledWith({ id: appointment.id, startAt: "2026-10-21T17:15:00.000Z" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.useAgenda).toHaveBeenLastCalledWith("2026-10-21");
    expect(screen.getByRole("status")).toHaveTextContent("Horário do agendamento atualizado.");
  });

  it("mantém o formulário e apresenta a mensagem quando o novo horário está lotado", async () => {
    mocks.update.mockRejectedValue(new Error("Este profissional já possui dois pets nesse período. Escolha outro horário."));
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "11:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar horário" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Este profissional já possui dois pets nesse período.");
    expect(within(dialog).getByLabelText("Horário inicial")).toHaveValue("11:00");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("avisa para reenviar um lembrete que já havia sido enviado", () => {
    mocks.useAgenda.mockReturnValue({ data: agendaWith({ ...appointment, reminderSentAt: "2026-10-19T12:00:00.000Z" }), isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);

    expect(within(openEditor()).getByText("Após alterar o horário, envie um novo lembrete para avisar o tutor.")).toBeInTheDocument();
  });

  it("cancelar fecha a edição sem salvar e reabrir recupera o horário original", () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();
    fireEvent.change(within(dialog).getByLabelText("Horário inicial"), { target: { value: "15:00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(within(openEditor()).getByLabelText("Horário inicial")).toHaveValue("09:00");
  });

  it("bloqueia duplo envio e o fechamento enquanto salva", () => {
    mocks.pending = true;
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    const dialog = openEditor();

    expect(within(dialog).getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(within(dialog).getByLabelText("Horário inicial")).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar janela" }));
    expect(dialog).toBeInTheDocument();
  });

  it("não mostra a edição para quem só pode consultar", () => {
    render(<GroomingSchedulePage canManage={false} canManageCustomers={false}/>);
    expect(screen.queryByRole("button", { name: "Editar horário" })).not.toBeInTheDocument();
  });

  it("não mostra a edição em atendimentos cancelados", () => {
    mocks.useAgenda.mockReturnValue({ data: { ...agendaWith({ ...appointment, status: "CANCELLED" }), reminders: [] }, isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    expect(screen.queryByRole("button", { name: "Editar horário" })).not.toBeInTheDocument();
  });
});

describe("comissões na agenda", () => {
  const commissioned = { ...appointment, commissionAmount: 31.5, professional: { ...appointment.professional, commissionPercent: 35 } };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending = false;
    mocks.saveProfessional.mockResolvedValue({ updated: true });
    mocks.useAgenda.mockReturnValue({ data: agendaWith(commissioned), isPending: false, isError: false });
  });

  it("mostra a comissão registrada mesmo quando o percentual atual mudou", () => {
    mocks.useAgenda.mockReturnValue({ data: agendaWith({ ...commissioned, professional: { ...commissioned.professional, commissionPercent: 50 } }), isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    expect(screen.getByText("Comissões previstas").parentElement).toHaveTextContent("31,50");
    expect(screen.getByText(/Comissão prevista do dia:/)).toHaveTextContent("31,50");
    expect(screen.getByText(/^Comissão R\$/)).toHaveTextContent("31,50");
  });

  it("exclui cancelados e faltas dos totais mantendo o histórico visível", () => {
    mocks.useAgenda.mockReturnValue({ data: { ...agendaWith(commissioned), appointments: [
      commissioned,
      { ...commissioned, id: "cancelled", status: "CANCELLED" },
      { ...commissioned, id: "no-show", status: "NO_SHOW" }
    ] }, isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    expect(screen.getByText("Comissões previstas").parentElement).toHaveTextContent("31,50");
    expect(screen.getByText("Valor previsto").parentElement).toHaveTextContent("90,00");
    expect(screen.getAllByText("Comissão não contabilizada")).toHaveLength(2);
  });

  it("carrega e salva o percentual brasileiro ao editar o profissional", async () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Serviços e profissionais" }));
    const dialog = screen.getByRole("dialog", { name: "Serviços e profissionais" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Juliana 35%" }));
    expect(within(dialog).getByLabelText("Comissão (%)")).toHaveValue("35");
    fireEvent.change(within(dialog).getByLabelText("Comissão (%)"), { target: { value: "33,33" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar profissional" }));
    await waitFor(() => expect(mocks.saveProfessional).toHaveBeenCalledWith({ id: "professional-1", name: "Juliana", commissionPercent: 33.33 }));
    await waitFor(() => expect(within(dialog).getByLabelText("Comissão (%)")).toHaveValue("30"));
  });

  it("preenche 30% por padrão para novos profissionais", async () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Serviços e profissionais" }));
    const dialog = screen.getByRole("dialog", { name: "Serviços e profissionais" });
    expect(within(dialog).getByLabelText("Comissão (%)")).toHaveValue("30");
    fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "Carla" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Adicionar profissional" }));
    await waitFor(() => expect(mocks.saveProfessional).toHaveBeenCalledWith({ id: undefined, name: "Carla", commissionPercent: 30 }));
  });

  it("apresenta o erro de percentual antes de enviar", () => {
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Serviços e profissionais" }));
    const dialog = screen.getByRole("dialog", { name: "Serviços e profissionais" });
    fireEvent.change(within(dialog).getByLabelText("Nome"), { target: { value: "Carla" } });
    fireEvent.change(within(dialog).getByLabelText("Comissão (%)"), { target: { value: "101" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Adicionar profissional" }));
    expect(within(dialog).getByText("A comissão não pode ultrapassar 100%.")).toBeInTheDocument();
    expect(mocks.saveProfessional).not.toHaveBeenCalled();
  });

  it("atualiza a prévia da comissão ao mudar valor ou profissional", () => {
    const data = agendaWith(commissioned);
    data.professionals.push({ id: "professional-2", name: "Carla", commissionPercent: 50 });
    mocks.useAgenda.mockReturnValue({ data, isPending: false, isError: false });
    render(<GroomingSchedulePage canManage canManageCustomers={false}/>);
    fireEvent.click(screen.getByRole("button", { name: "Novo agendamento" }));
    const dialog = screen.getByRole("dialog", { name: "Novo agendamento" });
    expect(within(dialog).getByText(/Comissão de Juliana/)).toHaveTextContent("31,50");
    fireEvent.change(within(dialog).getByLabelText("Valor"), { target: { value: "R$ 100,00" } });
    expect(within(dialog).getByText(/Comissão de Juliana/)).toHaveTextContent("35,00");
    fireEvent.change(within(dialog).getByLabelText("Profissional"), { target: { value: "professional-2" } });
    expect(within(dialog).getByText(/Comissão de Carla/)).toHaveTextContent("50,00");
  });
});
