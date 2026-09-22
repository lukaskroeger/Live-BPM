using FluentValidation;
using LiveBPM.Contracts.Features.Todos;

namespace LiveBPM.Application.Features.Todos;

public sealed class CreateTodoItemCommandValidator : AbstractValidator<CreateTodoItemCommand>
{
    public CreateTodoItemCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Title is required and must be at most 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .When(x => !string.IsNullOrWhiteSpace(x.Description))
            .WithMessage("Description must be at most 2000 characters.");
    }
}
