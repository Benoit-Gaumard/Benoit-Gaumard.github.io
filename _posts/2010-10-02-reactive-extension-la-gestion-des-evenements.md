---
layout: post
title: Reactive Extension - La gestion des évènements
date: 2010-10-02
categories: [ "Divers" ]
comments_id: 49 
---

Les Reactive Extension, ça ne vous dit rien, j’ai presque envie de dire normal, on entend beaucoup plus parler de Rx, et bien scoop c’est la même chose. Et si ça ne vous dit toujours rien, on appelle Rx aussi Linq To Events.

Donc Rx, ça sert à quoi, et bien cela sert à exécuter un ensemble de processus de manière synchronisée et cependant qui communiquent entre eux grâce à différents signaux.

Dans cet article on va voir un cas pratique pour Rx. Je suis presque sûr que tout le monde un jour a utilisé des méthodes asynchrones, et il y a souvent des cas où vous aviez une liste d’objet qui devait aller chercher des données via ces méthodes.Et là apparait un problème récurrent, comment réaliser une action quand tous les traitements sont finis.

Et maintenant, si l’on passait au code !

```csharp
Stopwatch watch = new Stopwatch();
List<Person> People = new List<Person>
                           {
                               new Person() {FirstName = "a", Name = "a"},
                               new Person() {FirstName = "b", Name = "b"},
                               new Person() {FirstName = "c", Name = "c"}
                           };

Console.WriteLine("Exécution sans Rx");
watch.Start();
foreach (var p in People)
{
    Work work = new Work();
    Person person = p;
    work.WorkerCompleted += (sender, e) =>
                                {
                                    Console.WriteLine(watch.Elapsed);
                                    Console.WriteLine(person.FirstName + " : Operation finish");
                                };
    work.WorkerAsync(p);
}
Console.WriteLine(watch.Elapsed);
watch.Start();
Console.WriteLine("finish");
```

J’ai crée ici une liste de personne, et pour chacune d’entre elle j’effectue un traitement d’une longue durée. La classe Work dans ce cas, est uniquement une classe qui fournit un évènement asynchrone et réalisant dans ce cas un simple Thread.Sleep(10000) pour les différents tests.

Donc pour quelqu’un d’averti, on peut voir que ce code somme toute très simple, ne permet pas de savoir quand toutes les personnes ont finies leur travail, puisqu’en effet, le traitement se fait de manière asynchrone. Si l’on exécute ce bout de code, on obtient donc quelque chose dans ce genre :

![image]({{ site.url }}/images/2010/10/02/reactive-extension-la-gestion-des-evenements-img0.png "image")

Dans ce cas précis, plusieurs options s’offrent à nous, dont certaines sont beaucoup moins jolies que d’autres.

La première serait de créer un nouvelle fonction dans le traitement, mais cette fois-ci exécutant l’opération pour une liste d’objets, et non un seul objet. Ceci pourrait fonctionner dans le cadre d’un service dont on peut aussi modifier le code, cependant c’est rarement le cas.

La deuxième qui n’est pas très élégant serait de marquer tous les objets dont le traitement est terminé, et lorsqu’ils sont tous terminés, on peut continuer notre traitement.

La troisième est d’utiliser les Reactive Extension afin de grouper les différents évènements et tous les exécuter. Donc commençons par le code global :

```csharp
watch.Restart();
var RxPeople = new List<IObservable<Person>>();
People.ForEach((p) =>
                    {
                        var asPerson = new AsyncSubject<Person>();
                        Work work = new Work();
                        work.WorkerCompleted +=
                            (sender, e) =>
                            {
                                Console.WriteLine(p.FirstName +
                                                  " : Rx Operation finish");
                                asPerson.OnCompleted();
                            };
                        work.WorkerAsync(p);
                        asPerson.OnNext(p);

                        RxPeople.Add(asPerson);
                    });

RxPeople.ForkJoin().Subscribe(person =>
                                  {
                                      /\* Nothing in this case */ },
                              () =>
                                  {
                                      Console.WriteLine(watch.Elapsed);
                                      Console.WriteLine("FINISH");
                                  });
```

On va donc commencer par créer une liste de IObservable, cet objet est fourni par Rx et permet de définir un provider pour les modifications sur des objets de type Person dans notre cas. Ensuite pour chacun des objets, nous allons créer un AsyncSubject, objet également fourni par Rx, qui va nous permettre de définir les méthodes OnNext, et OnCompleted, afin de savoir quand est-ce que le tratiement sur un élément commence, et quand il finit.

On peut donc voir que dans ce cas, le traitement est terminé, lors du retour du traitement.Pour finir, nous allons exécuter nos évènements, grâce à la méthode ForkJoin qui permet de paralléliser toutes les opérations, et pour finir nous allons nous abonner au résultat. On peut néanmoins remarquer que la méthode Subscribe(Action<Person> onNext, Action onCompleted) ne comporte aucune action onNext, cependant on pourrait effectuer un traitement pour par exemple traiter les données récupérées. Le dernier paramètres est exécuté lorsque toutes les opérations sont terminées.

A l’exécution on obtient quelque chose de similaire à cela :

![image]({{ site.url }}/images/2010/10/02/reactive-extension-la-gestion-des-evenements-img1.png "image")

Rx ne contient pas que la méthode ForkJoin qui vous permet de paralléliser vos tâches, il y en a bien d’autres, vous pouvez les retrouver des exemples [ici](http://rxwiki.wikidot.com/101samples) qui est un très bon Wiki !
